const csvFilePath = "restaurants.csv";
let map = null;
let restaurantsData = [];
let searchResults = []; // 검색 결과 저장

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
            restaurantsData = results.data.filter(row => row.lat && row.lng);
            updateCategorySelect();
            initMap();
        },
        error: function(err) {
            console.error("CSV 로드 실패:", err);
        }
    });
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

function openAddModal() {
    document.getElementById("addModal").style.display = "block";
}

function closeAddModal() {
    document.getElementById("addModal").style.display = "none";
    clearModalInputs();
}

function clearModalInputs() {
    document.getElementById("shopName").value = "";
    document.getElementById("name").value = "";
    document.getElementById("category").value = "";
    document.getElementById("rating").value = "";
    document.getElementById("capacity").value = "";
}

async function searchShop() {
    const query = document.getElementById("shopName").value.trim();
    console.log("검색 요청:", query);
    if (!query) {
        alert("가게 이름을 입력하세요!");
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/search?query=${encodeURIComponent(query)}`);
        const results = await response.json();
        if (results.error) {
            alert(results.error);
        } else {
            searchResults = results; // 검색 결과 저장
            openResultsWindow(results);
        }
    } catch (error) {
        alert("서버 연결 실패");
        console.error("Fetch 에러:", error);
    }
}

function openResultsWindow(results) {
    const popup = window.open("", "Search Results", "width=600,height=400");
    popup.document.write(`
        <html>
        <head><title>검색 결과</title></head>
        <body>
            <h2>검색 결과 (상위 5개)</h2>
            <ul>
                ${results.map((item, index) => `
                    <li>
                        <strong>${item.name}</strong> (${item.category})<br>
                        주소: ${item.address}<br>
                        <button onclick="window.opener.selectShop(${index})">선택</button>
                    </li>
                `).join("")}
            </ul>
        </body>
        </html>
    `);
    popup.document.close();
}

window.selectShop = function(index) {
    const selected = searchResults[index];
    document.getElementById("name").value = selected.name;
    document.getElementById("category").value = selected.category;
    document.getElementById("shopName").dataset.coords = `${selected.lat},${selected.lng}`; // 좌표 저장
    console.log("선택한 가게:", selected);
    window.close(); // 팝업 닫기
};

function addRestaurant() {
    const coords = document.getElementById("shopName").dataset.coords;
    if (!coords) {
        alert("먼저 가게를 검색해서 선택해주세요!");
        return;
    }

    const [lat, lng] = coords.split(",");
    const newRestaurant = {
        category: document.getElementById("category").value,
        name: document.getElementById("name").value,
        rating: document.getElementById("rating").value,
        lat: lat,
        lng: lng,
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
