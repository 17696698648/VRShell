<template>
  <section class="settings-section">
    <div><h3>Terminal</h3><p>Terminal rendering is isolated from Vue reactivity for high-frequency output.</p></div>
    <label class="settings-field"><span>Font family</span><input disabled value="Cascadia Mono, JetBrains Mono, Consolas" /></label>
    <label class="settings-field"><span>Cursor</span><select disabled><option>Block</option><option>Bar</option><option>Underline</option></select></label>
    <label class="settings-field"><span>Terminal profile</span><select disabled><option>Default SSH shell</option><option>Login shell with keepalive</option></select><small>Profiles will control shell, env, scrollback, and cursor style.</small></label>
  </section>
</template>
