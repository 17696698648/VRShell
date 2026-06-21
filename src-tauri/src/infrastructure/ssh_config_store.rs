use crate::{
    domain::ssh_config::{parse_ssh_config, SshConfigHost},
    error::{BackendError, BackendResult},
};
use std::{env, fs, path::PathBuf};

pub(crate) struct SshConfigStore {
    home_dir: Option<PathBuf>,
}

impl SshConfigStore {
    pub(crate) fn from_environment() -> Self {
        Self {
            home_dir: home_dir_from_environment(),
        }
    }

    pub(crate) fn load_hosts(&self) -> BackendResult<Vec<SshConfigHost>> {
        let Some(home_dir) = &self.home_dir else {
            return Ok(Vec::new());
        };
        let config_path = home_dir.join(".ssh").join("config");
        if !config_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&config_path).map_err(|error| {
            BackendError::storage(format!("failed to read ssh config: {error}"))
        })?;
        Ok(parse_ssh_config(&content, home_dir.to_str()))
    }
}

fn home_dir_from_environment() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}
