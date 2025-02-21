// CSV 파일 경로 (같은 저장소에 있는 경우 상대 경로 사용)
const csvFilePath = "data.csv";

// 페이지 로드 시 CSV에서 카테고리 목록 가져오기
window.onload = function() {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            const categories = [...new Set(data.map(row => row.category))]; // 중복 제거한 카테고리 목록
            const select = document.getElementById("categorySelect");

            categories.forEach(category => {
                if (category) { // 빈 값 제외
                    const option = document.createElement("option");
                    option.value = category;
                    option.text = category;
                    select.appendChild(option);
                }
            });
        }
    });
};

// 선택한 카테고리에 맞는 표 생성
function generateTable() {
    const select = document.getElementById("categorySelect");
    const selectedCategories = Array.from(select.selectedOptions).map(option => option.value);
    
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            const filteredData = data.filter(row => selectedCategories.includes(row.category));

            // 표 생성
            let tableHTML = "<table><tr><th>Category</th><th>Value</th></tr>";
            filteredData.forEach(row => {
                tableHTML += `<tr><td>${row.category}</td><td>${row.value}</td></tr>`;
            });
            tableHTML += "</table>";

            document.getElementById("tableContainer").innerHTML = tableHTML;
        }
    });
}
