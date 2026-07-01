use crate::error::scrub_sensitive_message;
use crate::infrastructure::event_bus::EventSink;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutputEventPayload {
    session_id: String,
    data_base64: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionEventPayload {
    session_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalErrorEventPayload {
    session_id: String,
    error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct HostKeyRequestedPayload {
    pub(super) pending_id: String,
    pub(super) host: String,
    pub(super) port: u16,
    pub(super) fingerprint: String,
    pub(super) key_type: String,
    pub(super) reason: String,
    pub(super) known_fingerprint: Option<String>,
}

pub(super) fn emit_host_key_requested(
    event_sink: &impl EventSink,
    payload: HostKeyRequestedPayload,
) {
    event_sink.emit_event(crate::ipc::events::SECURITY_HOST_KEY_REQUESTED, payload);
}

pub(super) fn emit_terminal_output(event_sink: &impl EventSink, session_id: &str, text: String) {
    event_sink.emit_event(
        crate::ipc::events::TERMINAL_OUTPUT,
        TerminalOutputEventPayload {
            session_id: session_id.to_string(),
            data_base64: STANDARD.encode(text.as_bytes()),
        },
    );
}

pub(super) fn emit_terminal_error(
    event_sink: &impl EventSink,
    session_id: &str,
    error: impl Into<String>,
) {
    let error = scrub_sensitive_message(error.into());
    event_sink.emit_event(
        crate::ipc::events::TERMINAL_ERROR,
        TerminalErrorEventPayload {
            session_id: session_id.to_string(),
            error,
        },
    );
}

pub(super) fn emit_terminal_closed(event_sink: &impl EventSink, session_id: &str) {
    event_sink.emit_event(
        crate::ipc::events::TERMINAL_CLOSED,
        TerminalSessionEventPayload {
            session_id: session_id.to_string(),
        },
    );
}
