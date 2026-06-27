use std::path::PathBuf;

#[derive(Debug, Clone)]
pub(crate) struct AppPaths {
    app_data_dir: PathBuf,
    known_hosts_path: PathBuf,
}

impl AppPaths {
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            known_hosts_path: Self::default_known_hosts_path(),
        }
    }

    pub(crate) fn default_known_hosts_path() -> PathBuf {
        default_known_hosts_path()
    }

    #[cfg(test)]
    pub(crate) fn with_known_hosts_path(app_data_dir: PathBuf, known_hosts_path: PathBuf) -> Self {
        Self {
            app_data_dir,
            known_hosts_path,
        }
    }

    pub(crate) fn app_data_dir(&self) -> PathBuf {
        self.app_data_dir.clone()
    }

    pub(crate) fn known_hosts_path(&self) -> PathBuf {
        self.known_hosts_path.clone()
    }
}

fn default_known_hosts_path() -> PathBuf {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."));
    home.join(".ssh").join("known_hosts")
}

#[cfg(test)]
mod tests {
    use super::AppPaths;
    use std::path::PathBuf;

    #[test]
    fn app_paths_can_override_known_hosts_path() {
        let app_data_dir = PathBuf::from("/tmp/vrshell-data");
        let known_hosts_path = PathBuf::from("/tmp/vrshell-known-hosts");

        let paths = AppPaths::with_known_hosts_path(app_data_dir.clone(), known_hosts_path.clone());

        assert_eq!(paths.app_data_dir(), app_data_dir);
        assert_eq!(paths.known_hosts_path(), known_hosts_path);
    }
}
