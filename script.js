document.addEventListener("DOMContentLoaded", () => {

  const startBtn = document.getElementById("startBtn");
  const resultsBody = document.getElementById("resultsBody");
  const statusText = document.getElementById("status");
  const categoryFilter = document.getElementById("categoryFilter");
  const exportBtn = document.getElementById("exportBtn");

  const TEST_DOMAINS = ["google.com", "youtube.com", "facebook.com"];

  let latestResults = [];

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

        if (server.doh.includes("resolve")) {
          url = `${server.doh}?name=${testDomain}&type=A`;
        } else {
          url = `${server.doh}${testDomain}&type=A`;
        }

        await fetch(url, { headers: { accept: "application/dns-json" } });

        const end = performance.now();
        times.push(end - start);
        success++;

      } catch {
        times.push(null);
      }
    }

    const valid = times.filter(t => t !== null);

    const avg = valid.length
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : null;

    return {
      name: server.name,
      category: server.category,
      avg,
      success: `${success}/${TEST_DOMAINS.length}`
    };
  }

  function renderResults(results) {
    resultsBody.innerHTML = "";

    if (!results.length) return;

    const fastest = results.find(r => r.avg !== null);

    results.forEach((r, index) => {

      const row = document.createElement("tr");

      if (fastest && r.name === fastest.name) {
        row.classList.add("fastest");
      }

      let speedText = "Failed";
      if (r.avg !== null) speedText = r.avg.toFixed(2);

      let badge = "";
      if (fastest && r.name === fastest.name) {
        badge = `<span class="badge">Recommended</span>`;
      }

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${r.name} ${badge}</td>
        <td>${speedText}</td>
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
    const selectedCategory = categoryFilter.value;

    const filtered = selectedCategory === "all"
      ? dnsList
      : dnsList.filter(d => d.category === selectedCategory);

    const results = [];

    for (const server of filtered) {
      const result = await testServer(server);
      results.push(result);
    }

    results.sort((a, b) => {
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

    latestResults = results;

    renderResults(results);

    statusText.textContent = "Done.";
    startBtn.disabled = false;
  });

  exportBtn.addEventListener("click", () => {
    if (!latestResults.length) return;

    const blob = new Blob(
      [JSON.stringify(latestResults, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dns-speed-results.json";
    a.click();

    URL.revokeObjectURL(url);
  });

});
