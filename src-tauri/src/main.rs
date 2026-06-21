#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod domain;
mod error;
mod infrastructure;
mod ipc;
mod services;
mod state;

fn main() {
    app::run();
}
