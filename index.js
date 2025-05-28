let csvData = [];

function loadCSVData() {
  return fetch('https://raw.githubusercontent.com/com-480-data-visualization/com480-project-colocaviz/refs/heads/main/data/merged_data.csv')
    .then(response => response.text())
    .then(csvText => {
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: function(results) {
            csvData = results.data;
            resolve(csvData);
          }
        });
      });
    });
}
