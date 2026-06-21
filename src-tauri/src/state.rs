use crate::domain::terminal::TerminalSession;
use std::{collections::HashMap, path::PathBuf, sync::Mutex};

pub(crate) struct BackendState {
    pub app_data_dir: PathBuf,
    pub terminals: Mutex<HashMap<String, TerminalSession>>,
}

impl BackendState {
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            terminals: Mutex::new(HashMap::new()),
        }
    }
}
