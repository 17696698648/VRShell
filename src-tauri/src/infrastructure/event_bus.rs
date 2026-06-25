//! Event Sink 抽象
//!
//! 将事件发射能力从 `tauri::WebviewWindow` 解耦，
//! 使 services 层仅依赖此 trait，而非直接依赖 Tauri 类型。

use serde::Serialize;
use tauri::Emitter;

/// 事件发射器抽象
pub(crate) trait EventSink {
    fn emit_event(&self, event: &str, payload: impl Serialize + Clone);
}

impl EventSink for tauri::WebviewWindow {
    fn emit_event(&self, event: &str, payload: impl Serialize + Clone) {
        let _ = Emitter::emit(self, event, payload);
    }
}
