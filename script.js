const csvFilePath = "restaurants.csv";
let map = null;
let restaurantsData = []; // 메모리에 데이터 저장

// 페이지 로드 시 초기화
window.onload = function() {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            restaurantsData = results.data;
            updateCategorySelect();
            initMap();
        }
    });
};

// 카테고리 선택 업데이트
function updateCategorySelect() {
    const categories = [...new Set(restaurantsData.map(row => row.category))];
    const select = document.getElementById("categorySelect");
    select.innerHTML = "";
    categories.forEach(category => {
        if (category) {
            const option = document.createElement("option");
            option.value = category;
            option.text = category;
            select.appendChild(option);
        }
    });
}

// 지도 초기화
function initMap() {
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780),
        zoom: 14
    });
}

// 필터링 및 지도 표시
function generateTableAndMap() {
    const select = document.getElementById("categorySelect");
    const selectedCategories = Array.from(select.selectedOptions).map(option => option.value);
    const filteredData = restaurantsData.filter(row => selectedCategories.includes(row.category));

    let tableHTML = "<table><tr><th>카테고리</th><th>이름</th><th>평점</th><th>수용인원</th></tr>";
    filteredData.forEach(row => {
        tableHTML += `<tr><td>${row.category}</td><td>${row.name}</td><td>${row.rating}</td><td>${row.capacity}</td></tr>`;
    });
    tableHTML += "</table>";
    document.getElementById("tableContainer").innerHTML = tableHTML;

    if (window.markers) window.markers.forEach(marker => marker.setMap(null));
    window.markers = [];
    if (filteredData.length > 0) {
        const bounds = new naver.maps.LatLngBounds();
        filteredData.forEach(row => {
            const position = new naver.maps.LatLng(row.lat, row.lng);
            bounds.extend(position);
            const marker = new naver.maps.Marker({ position, map, title: row.name });
            window.markers.push(marker);
        });
        map.fitBounds(bounds);
    }
}

// 모달 열기/닫기
function openAddModal() {
    document.getElementById("addModal").style.display = "block";
}
function closeAddModal() {
    document.getElementById("addModal").style.display = "none";
    clearModalInputs();
}
function clearModalInputs() {
    document.getElementById("naverLink").value = "";
    document.getElementById("name").value = "";
    document.getElementById("category").value = "";
    document.getElementById("rating").value = "";
    document.getElementById("capacity").value = "";
}

// 네이버 링크 파싱 (위도/경도 추출)
function parseNaverLink() {
    const link = document.getElementById("naverLink").value;
    // 예: https://map.naver.com/v5/entry/place/12345?c=141.123,37.456,15,0,0,0,dh
    const regex = /c=(\d+\.\d+),(\d+\.\d+)/;
    const match = link.match(regex);
    if (match) {
        const lng = match[1]; // 경도
        const lat = match[2]; // 위도
        document.getElementById("name").value = "가게명 (자동)"; // 임시
        document.getElementById("category").value = "카테고리 (자동)"; // 임시
        return { lat, lng };
    } else {
        alert("유효한 네이버 지도 링크를 입력하세요.");
        return null;
    }
}

// 맛집 추가
function addRestaurant() {
    const coords = parseNaverLink();
    if (!coords) return;

    const newRestaurant = {
        category: document.getElementById("category").value,
        name: document.getElementById("name").value,
        rating: document.getElementById("rating").value,
        lat: coords.lat,
        lng: coords.lng,
        capacity: document.getElementById("capacity").value
    };

    restaurantsData.push(newRestaurant);
    updateCategorySelect();
    closeAddModal();

    // CSV로 내보내기 (브라우저 다운로드)
    const csv = Papa.unparse(restaurantsData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "restaurants_updated.csv";
    link.click();
}
