const { spawn } = require('child_process');
const fs = require('fs');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--window-size=1280,800',
  '--remote-debugging-port=9222',
  'http://localhost:5173/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    const tab = tabs[0];
    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

    ws.onopen = () => {
      // 1. Inject localStorage user
      const script = `
        localStorage.setItem('user', JSON.stringify({
          id: 'test-sa',
          name: 'Super Admin User',
          role: 'SUPERADMIN',
          email: 'admin@champions.club',
          amount: 50000
        }));
        location.reload();
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: script } }));
    };

    let step = 1;
    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === 1) {
        // Wait 1.5s after reload
        setTimeout(() => {
          // Check DOM elements and screenshot
          const checkExpr = `
            (() => {
              const links = Array.from(document.querySelectorAll('.navbar-nav-links a')).map(a => ({
                text: a.textContent.trim(),
                href: a.getAttribute('href'),
                offsetParent: a.offsetParent !== null,
                rect: a.getBoundingClientRect()
              }));
              const navLinksContainer = document.querySelector('.navbar .nav-link-container');
              const navCta = document.querySelector('.navbar-cta-container');
              const navBar = document.querySelector('.navbar-nav-container');
              return {
                windowWidth: window.innerWidth,
                navBarWidth: navBar?.getBoundingClientRect().width,
                containerWidth: navLinksContainer?.getBoundingClientRect().width,
                ctaWidth: navCta?.getBoundingClientRect().width,
                links
              };
            })()
          `;
          ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: checkExpr, returnByValue: true } }));
        }, 1500);
      } else if (msg.id === 2) {
        console.log('DOM Evaluation:', JSON.stringify(msg.result?.result?.value, null, 2));

        // Take screenshot
        ws.send(JSON.stringify({ id: 3, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      } else if (msg.id === 3) {
        const base64 = msg.result?.data;
        if (base64) {
          fs.writeFileSync('C:\\Users\\omgop\\.gemini\\antigravity\\brain\\ddb0addb-02d3-4c2d-b248-9e44c6d75044\\navbar_superadmin.png', Buffer.from(base64, 'base64'));
          console.log('Saved screenshot to navbar_superadmin.png');
        }
        chrome.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
  }
}, 2000);
