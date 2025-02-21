const csvFilePath = "restaurants.csv";
let map = null;
let restaurantsData = [];

// 네이버 지도 API 로드 완료 확인
function initMap() {
    if (typeof naver === "undefined" || !naver.maps) {
        console.error("네이버 지도 API가 로드되지 않았습니다.");
        setTimeout(initMap, 500); // 0.5초 후 재시도
        return;
    }
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780),
        zoom: 14
    });
}

// 페이지 로드 시 초기화
window.onload = function() {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            restaurantsData = results.data;
            updateCategorySelect();
            initMap(); // 지도 초기화
        },
        error: function(err) {
            console.error("CSV 로드 실패:", err);
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

// 필터링 및 지도 표시
function generateTableAndMap() {
    if (!map) {
        console.error("지도가 초기화되지 않았습니다.");
        return;
    }

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

// 네이버 링크 파싱
function parseNaverLink() {
    const link = document.getElementById("naverLink").value;
    const regex = /c=(\d+\.\d+),(\d+\.\d+)/;
    const match = link.match(regex);
    if (match) {
        const lng = match[1];
        const lat = match[2];
        document.getElementById("name").value = "가게명 (자동)";
        document.getElementById("category").value = "카테고리 (자동)";
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

    const csv = Papa.unparse(restaurantsData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "restaurants_updated.csv";
    link.click();
}
