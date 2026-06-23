use crate::{
    domain::terminal::{TerminalOutputEvent, TerminalSession},
    services::terminal_service::TerminalRuntime,
};
use std::{collections::HashMap, path::PathBuf, sync::Mutex};

pub(crate) struct BackendState {
    pub app_data_dir: PathBuf,
    pub terminals: Mutex<HashMap<String, TerminalSession>>,
    pub terminal_runtimes: Mutex<HashMap<String, TerminalRuntime>>,
    pub terminal_events: Mutex<HashMap<String, Vec<TerminalOutputEvent>>>,
}

impl BackendState {
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            terminals: Mutex::new(HashMap::new()),
            terminal_runtimes: Mutex::new(HashMap::new()),
            terminal_events: Mutex::new(HashMap::new()),
        }
    }
}
