//! Interactive SSH connection — request / response protocol between the
//! backend session thread and the frontend UI.
//!
//! When the SSH connection thread needs a user decision (host key trust,
//! credentials, keyboard-interactive answers) it sends an `InteractionRequest`
//! via a Tauri event and **blocks** on an mpsc channel until the frontend
//! responds through the `respond_to_interaction` command.
//!
//! This keeps the TCP + SSH handshake alive across the decision point,
//! avoiding the wasteful disconnect–reconnect dance of the previous approach.

use crate::sessions::AppState;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    path::PathBuf,
    sync::{atomic::AtomicBool, mpsc, Arc, Mutex},
    time::Duration,
};
use tauri::Emitter;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// A single keyboard-interactive prompt (e.g. "Password:" or "OTP:").
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KbPrompt {
    pub prompt: String,
    /// `false` for password fields (input should be masked).
    pub echo: bool,
}

/// Requests the backend can make to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InteractionRequest {
    /// First-time connection or host key changed.
    HostKeyVerification {
        host: String,
        port: u16,
        /// SHA256:xxxx … fingerprint (OpenSSH-style).
        fingerprint: String,
        /// ssh-ed25519, ecdsa-sha2-nistp256, …
        key_type: String,
        /// `false` = first time seeing this host; `true` = key changed (MITM warning).
        is_mismatch: bool,
    },
    /// All pre-configured auth methods failed — ask for new credentials.
    AuthenticationNeeded {
        host: String,
        username: String,
        /// Methods already attempted (informational).
        tried_methods: Vec<String>,
        /// Methods the server advertised as available.
        available_methods: Vec<String>,
        /// Human-readable hint from the last auth failure.
        error_hint: Option<String>,
    },
    /// keyboard-interactive challenge (2FA, OTP, custom PAM modules).
    KeyboardInteractive {
        /// Name of the challenge (e.g. "Password authentication").
        name: String,
        /// Instruction text (may be empty).
        instruction: String,
        /// One or more prompts the user must answer.
        prompts: Vec<KbPrompt>,
    },
}

/// Responses the frontend can send back.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InteractionResponse {
    /// Accept the host key — backend will write it to known_hosts and proceed.
    HostKeyAccepted,
    /// Reject the host key — backend will tear down the connection.
    HostKeyRejected,
    /// Provide new credentials for a retry.
    Credentials {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        password: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        private_key_path: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        passphrase: Option<String>,
    },
    /// Answers to keyboard-interactive prompts.
    KeyboardInteractiveAnswers { answers: Vec<String> },
    /// User cancelled — tear down the connection.
    Cancel,
}

// ---------------------------------------------------------------------------
// Channel plumbing
// ---------------------------------------------------------------------------

/// The send-half stored so `respond_to_interaction` can reach the waiting thread.
pub(crate) type PendingInteractionSender = mpsc::Sender<InteractionResponse>;

/// Map of session_id → sender for in-flight interactions.
pub(crate) type PendingInteractionMap = Arc<Mutex<HashMap<String, PendingInteractionSender>>>;

/// How long the thread waits for a frontend response before timing out.
const INTERACTION_TIMEOUT: Duration = Duration::from_secs(120);

// ---------------------------------------------------------------------------
// Interaction context (thread-safe, cloneable)
// ---------------------------------------------------------------------------

/// Lightweight cloneable context passed into OS threads so they can invoke
/// interactive flows without holding a full `&AppState` reference.
///
/// All fields are `Arc`-wrapped — cloning is cheap.
#[derive(Clone)]
pub(crate) struct InteractionContext {
    pub(crate) pending_map: PendingInteractionMap,
    pub(crate) hash_known_hosts: Arc<AtomicBool>,
    pub(crate) known_hosts_path_override: Arc<Mutex<Option<PathBuf>>>,
}

impl InteractionContext {
    /// Build from the top-level `AppState` before spawning a thread.
    pub(crate) fn from_state(state: &AppState) -> Self {
        Self {
            pending_map: state.pending_interactions.clone(),
            hash_known_hosts: state.hash_known_hosts.clone(),
            known_hosts_path_override: state.known_hosts_path_override.clone(),
        }
    }
}

// ---------------------------------------------------------------------------
// Backend helper: block waiting for a frontend response
// ---------------------------------------------------------------------------

/// Send an `interaction-required` event to the frontend and block until the
/// frontend calls `respond_to_interaction` (or the timeout expires).
///
/// Takes the cloneable `InteractionContext` so it can be called from OS threads
/// that don't have access to Tauri's `State<AppState>`.
///
/// Returns `Ok(response)` on success, or an `SshError` on timeout / cancel.
pub(crate) fn request_interaction(
    app: &tauri::AppHandle,
    ctx: &InteractionContext,
    session_id: &str,
    request: InteractionRequest,
    output_queue: Option<&Arc<Mutex<VecDeque<String>>>>,
) -> Result<InteractionResponse, crate::connect::SshError> {
    let (tx, rx) = mpsc::channel();

    // Register the sender so `respond_to_interaction` can find it.
    {
        let mut pending = ctx.pending_map.lock().map_err(|e| {
            crate::connect::SshError::new("interaction", format!("lock: {}", e), false)
        })?;
        // Replace any stale pending interaction for this session.
        pending.insert(session_id.to_string(), tx);
    }

    // Notify the frontend via Tauri event.
    let payload = serde_json::json!({
        "session_id": session_id,
        "request": &request,
    });
    let _ = app.emit("interaction-required", &payload);

    // Also push to the output queue so the polling fallback picks it up.
    if let Some(queue) = output_queue {
        crate::sessions::push_output_event(
            queue,
            serde_json::json!({"event":"interaction-required","payload": payload}).to_string(),
        );
    }

    // Block with timeout.
    match rx.recv_timeout(INTERACTION_TIMEOUT) {
        Ok(response) => Ok(response),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            // Clean up stale entry.
            if let Ok(mut pending) = ctx.pending_map.lock() {
                pending.remove(session_id);
            }
            Err(crate::connect::SshError::new(
                "interaction_timeout",
                "No response from user within 120 seconds",
                false,
            ))
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => Err(crate::connect::SshError::new(
            "interaction_cancelled",
            "Interaction channel closed unexpectedly",
            false,
        )),
    }
}

// ---------------------------------------------------------------------------
// Tauri command: respond to a pending interaction
// ---------------------------------------------------------------------------

/// Called by the frontend to answer a pending `interaction-required` event.
#[tauri::command]
pub async fn respond_to_interaction(
    state: tauri::State<'_, AppState>,
    session_id: String,
    response: InteractionResponse,
) -> Result<(), String> {
    let sender = {
        let mut pending = state
            .pending_interactions
            .lock()
            .map_err(|e| format!("lock err: {}", e))?;
        pending
            .remove(&session_id)
            .ok_or_else(|| format!("no pending interaction for session {}", session_id))?
    };

    sender
        .send(response)
        .map_err(|_| "session thread is no longer waiting for a response".to_string())
}
