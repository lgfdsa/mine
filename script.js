const csvFilePath = "restaurants.csv";
let map = null;
let restaurantsData = [];

function initMap() {
    if (typeof naver === "undefined" || !naver.maps) {
        console.error("네이버 지도 API가 로드되지 않았습니다.");
        setTimeout(initMap, 500);
        return;
    }
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780),
        zoom: 14
    });
}

window.onload = function() {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        complete: function(results) {
            restaurantsData = results.data.filter(row => row.lat && row.lng); // 좌표 없는 데이터 제외
            updateCategorySelect();
            initMap();
        },
        error: function(err) {
            console.error("CSV 로드 실패:", err);
        }
    });

    // 이벤트 리스너 설정
    document.getElementById("filterButton").addEventListener("click", generateTableAndMap);
    document.getElementById("addButton").addEventListener("click", openAddModal);
    document.querySelector(".close").addEventListener("click", closeAddModal);
    document.getElementById("checkLinkButton").addEventListener("click", checkNaverLink);
    document.getElementById("confirmAddButton").addEventListener("click", addRestaurant);
};

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

function generateTableAndMap() {
    if (!map) {
        console.error("지도가 초기화되지 않았습니다.");
        alert("지도를 로드 중입니다. 잠시 후 다시 시도해주세요.");
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

    // 기존 마커 제거
    if (window.markers) window.markers.forEach(marker => marker.setMap(null));
    window.markers = [];

    if (filteredData.length > 0) {
        const bounds = new naver.maps.LatLngBounds();
        filteredData.forEach(row => {
            const position = new naver.maps.LatLng(row.lat, row.lng);
            bounds.extend(position);

            // 마커 생성
            const marker = new naver.maps.Marker({
                position: position,
                map: map,
                title: row.name
            });

            // 정보창 생성
            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div style="padding:10px;">
                        <h3>${row.name}</h3>
                        <p>카테고리: ${row.category}</p>
                        <p>평점: ${row.rating}</p>
                        <p>수용인원: ${row.capacity}</p>
                        <button onclick="window.open('${row.url || 'https://map.naver.com'}', '_blank')">지도 URL 열기</button>
                    </div>
                `
            });

            // 마커 클릭 시 정보창 열기
            naver.maps.Event.addListener(marker, "click", function() {
                if (infoWindow.getMap()) {
                    infoWindow.close();
                } else {
                    infoWindow.open(map, marker);
                }
            });

            window.markers.push(marker);
        });
        map.fitBounds(bounds);
    }
}

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
    document.getElementById("naverLink").dataset.coords = "";
}

async function checkNaverLink() {
    const link = document.getElementById("naverLink").value.trim();
    console.log("입력된 링크:", link);

    try {
        const response = await fetch(`http://localhost:3000/place?url=${encodeURIComponent(link)}`);
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            document.getElementById("naverLink").dataset.coords = "";
        } else {
            document.getElementById("name").value = data.name;
            document.getElementById("category").value = data.category;
            document.getElementById("naverLink").dataset.coords = `${data.lat},${data.lng}`;
            document.getElementById("naverLink").dataset.url = data.url;
            console.log("가져온 데이터:", data);
        }
    } catch (error) {
        alert("서버 연결 실패");
        console.error("Fetch 에러:", error);
    }
}

function addRestaurant() {
    const coords = document.getElementById("naverLink").dataset.coords;
    const url = document.getElementById("naverLink").dataset.url || ""; // URL 가져오기
    if (!coords) {
        alert("먼저 네이버 링크를 확인해주세요.");
        return;
    }

    const [lat, lng] = coords.split(",");
    const newRestaurant = {
        category: document.getElementById("category").value,
        name: document.getElementById("name").value,
        rating: document.getElementById("rating").value,
        lat: lat,
        lng: lng,
        capacity: document.getElementById("capacity").value,
        url: url // CSV에 URL 추가
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
