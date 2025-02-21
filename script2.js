const csvFilePath = "restaurants.csv";
let map = null;

// 페이지 로드 시 카테고리 목록 초기화
window.onload = function() {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            const categories = [...new Set(data.map(row => row.category))]; // 중복 제거
            const select = document.getElementById("categorySelect");

            categories.forEach(category => {
                if (category) { // 빈 값 제외
                    const option = document.createElement("option");
                    option.value = category;
                    option.text = category;
                    select.appendChild(option);
                }
            });

            // 지도 초기화 (기본 중심: 서울)
            map = new naver.maps.Map("map", {
                center: new naver.maps.LatLng(37.5665, 126.9780),
                zoom: 14
            });
        }
    });
};

// 필터링된 표와 지도 마커 생성
function generateTableAndMap() {
    const select = document.getElementById("categorySelect");
    const selectedCategories = Array.from(select.selectedOptions).map(option => option.value);

    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            const filteredData = data.filter(row => selectedCategories.includes(row.category));

            // 표 생성
            let tableHTML = "<table><tr><th>카테고리</th><th>이름</th><th>평점</th><th>수용인원</th></tr>";
            filteredData.forEach(row => {
                tableHTML += `<tr><td>${row.category}</td><td>${row.name}</td><td>${row.rating}</td><td>${row.capacity}</td></tr>`;
            });
            tableHTML += "</table>";
            document.getElementById("tableContainer").innerHTML = tableHTML;

            // 기존 마커 제거 및 새 마커 추가
            if (window.markers) {
                window.markers.forEach(marker => marker.setMap(null));
            }
            window.markers = [];

            // 지도 중심 조정 및 마커 표시
            if (filteredData.length > 0) {
                const bounds = new naver.maps.LatLngBounds();
                filteredData.forEach(row => {
                    const position = new naver.maps.LatLng(row.lat, row.lng);
                    bounds.extend(position);

                    const marker = new naver.maps.Marker({
                        position: position,
                        map: map,
                        title: row.name // 마커에 맛집 이름 표시
                    });
                    window.markers.push(marker);
                });
                map.fitBounds(bounds); // 모든 마커가 보이도록 지도 조정
            }
        }
    });
}
