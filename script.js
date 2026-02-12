const startBtn = document.getElementById("startBtn");
const resultsBody = document.getElementById("resultsBody");
const statusText = document.getElementById("status");

const TEST_DOMAINS = ["google.com", "youtube.com", "facebook.com"];

async function loadDNSList() {
  const res = await fetch("dns-list.json");
  return await res.json();
}

async function testServer(server) {
  let times = [];
  let success = 0;

  for (const domain of TEST_DOMAINS) {
    const random = Math.random().toString(36).substring(7);
    const testDomain = `${random}.${domain}`;

    const start = performance.now();

    try {
      let url;

      if (server.jsonApi) {
        url = `${server.doh}?name=${testDomain}&type=A`;
        await fetch(url, { headers: { accept: "application/dns-json" } });
      } else {
        url = `${server.doh}?dns=AAABAAABAAAAAAAABmdvb2dsZQNjb20AAAEAAQ`;
        await fetch(url);
      }

      const end = performance.now();
      times.push(end - start);
      success++;
    } catch {
      times.push(null);
    }
  }

  const validTimes = times.filter(t => t !== null);

  const avg =
    validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : null;

  return {
    name: server.name,
    avg,
    success: `${success}/${TEST_DOMAINS.length}`
  };
}

function renderResults(results) {
  resultsBody.innerHTML = "";

  results.forEach((r, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${r.name}</td>
      <td>${r.avg ? r.avg.toFixed(2) : "Failed"}</td>
      <td>${r.success}</td>
    `;

    resultsBody.appendChild(row);
  });
}

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  statusText.textContent = "Testing...";
  resultsBody.innerHTML = "";

  const dnsList = await loadDNSList();

  const results = [];

  for (const server of dnsList) {
    const result = await testServer(server);
    results.push(result);
  }

  results.sort((a, b) => {
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return a.avg - b.avg;
  });

  renderResults(results);

  statusText.textContent = "Done.";
  startBtn.disabled = false;
});
