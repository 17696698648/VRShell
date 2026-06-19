pub(crate) fn redact_sensitive(input: impl AsRef<str>) -> String {
    let mut text = input.as_ref().to_string();
    for key in [
        "password",
        "passphrase",
        "privateKeyPath",
        "private_key_path",
        "identity_file",
    ] {
        text = redact_key_value(&text, key);
    }
    redact_path_like_secrets(&text)
}

fn redact_key_value(input: &str, key: &str) -> String {
    let mut output = input.to_string();
    for separator in [":", "="] {
        let needle = format!("{key}{separator}");
        while let Some(start) = output.to_lowercase().find(&needle.to_lowercase()) {
            let value_start = start + needle.len();
            let value_end = output[value_start..]
                .find([',', ';', '\n', '\r'])
                .map(|offset| value_start + offset)
                .unwrap_or(output.len());
            output.replace_range(value_start..value_end, "<redacted>");
        }
    }
    output
}

fn redact_path_like_secrets(input: &str) -> String {
    input
        .split_whitespace()
        .map(|token| {
            let lower = token.to_lowercase();
            if lower.contains("id_rsa")
                || lower.contains("id_ed25519")
                || lower.ends_with(".pem")
                || lower.ends_with(".ppk")
            {
                "<redacted-path>"
            } else {
                token
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_password_like_values() {
        assert_eq!(
            redact_sensitive("password=secret, host=x"),
            "password=<redacted>, host=x"
        );
    }

    #[test]
    fn redacts_key_paths() {
        assert_eq!(
            redact_sensitive("using C:/Users/a/.ssh/id_rsa"),
            "using <redacted-path>"
        );
    }
}
