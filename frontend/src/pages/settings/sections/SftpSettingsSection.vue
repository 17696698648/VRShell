<template>
  <section class="settings-section">
    <div><h3>SFTP</h3><p>Transfer behavior is shared by SFTP Explorer, Task Center, and command actions.</p></div>
    <label class="settings-field"><span>Transfer concurrency</span><select disabled><option>2 parallel transfers</option><option>4 parallel transfers</option></select><small>Reserved for the transfer queue implementation.</small></label>
    <label class="settings-field"><span>Overwrite policy</span><select disabled><option>Ask every time</option><option>Overwrite newer</option><option>Skip existing</option></select></label>
  </section>
</template>
