const csvFilePath = "restaurants.csv";
let map = null;
let restaurantsData = [];
let searchResults = [];
let activeInfoWindow = null;

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

window.onload = async function() {
    // 서버에서 데이터 가져오기
    try {
        const response = await fetch("http://localhost:8080/restaurants");
        if (response.ok) {
            restaurantsData = await response.json();
            console.log("서버에서 데이터 로드:", restaurantsData);
        } else {
            throw new Error("서버 데이터 로드 실패");
        }
    } catch (error) {
        console.error("데이터 로드 중 오류:", error);
        // 서버 실패 시 CSV에서 초기 데이터 로드
        Papa.parse(csvFilePath, {
            download: true,
            header: true,
            complete: function(results) {
                restaurantsData = results.data.filter(row => row.lat && row.lng);
                console.log("CSV에서 데이터 로드:", restaurantsData);
            },
            error: function(err) {
                console.error("CSV 로드 실패:", err);
            }
        });
    }
    updateCategorySelect();
    initMap();
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

function convertNaverCoords(mapx, mapy) {
    return {
        lat: parseInt(mapy) / 10000000,
        lng: parseInt(mapx) / 10000000
    };
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

    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];

    if (filteredData.length > 0) {
        const bounds = new naver.maps.LatLngBounds();
        filteredData.forEach(row => {
            const lat = parseFloat(row.lat);
            const lng = parseFloat(row.lng);
            if (isNaN(lat) || isNaN(lng)) {
                console.error(`잘못된 좌표: ${row.name}, lat: ${row.lat}, lng: ${row.lng}`);
                return;
            }
            const position = new naver.maps.LatLng(lat, lng);
            bounds.extend(position);

            const marker = new naver.maps.Marker({
                position: position,
                map: map,
                title: row.name
            });

            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h3>${row.name}</h3>
                        ${row.link ? `<a href="${row.link}" target="_blank"><img src="https://img.icons8.com/material-outlined/24/000000/link.png" alt="링크" /></a>` : ""}
                    </div>
                `
            });

            naver.maps.Event.addListener(marker, "click", function() {
                if (activeInfoWindow) {
                    activeInfoWindow.close();
                }
                infoWindow.open(map, marker);
                activeInfoWindow = infoWindow;
            });

            window.markers.push(marker);
            console.log(`마커 추가: ${row.name} (${lat}, ${lng})`);
        });

        if (window.markers.length > 0) {
            map.fitBounds(bounds);
            const currentZoom = map.getZoom();
            map.setZoom(currentZoom - 3);
            console.log("지도 범위 조정 및 줌아웃 완료, 현재 줌:", map.getZoom());
        } else {
            console.warn("표시할 마커가 없습니다.");
        }
    } else {
        console.log("필터링된 데이터가 없습니다.");
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
    document.getElementById("lat").value = "";
    document.getElementById("lng").value = "";
    document.getElementById("shopName").dataset.coords = "";
    document.getElementById("shopName").dataset.link = "";
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
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "서버 응답 오류");
        }
        const results = await response.json();
        console.log("수신된 데이터:", results);
        searchResults = results;
        openResultsWindow(results);
    } catch (error) {
        alert("서버 연결 실패: " + error.message);
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
                        ${item.link ? `<a href="${item.link}" target="_blank">링크</a>` : ""}
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
    console.log("선택한 가게:", selected);

    document.getElementById("name").value = selected.name;
    document.getElementById("category").value = selected.category;
    const { lat, lng } = convertNaverCoords(selected.mapx, selected.mapy);
    document.getElementById("lat").value = lat;
    document.getElementById("lng").value = lng;
    document.getElementById("shopName").dataset.coords = `${lat},${lng}`;
    document.getElementById("shopName").dataset.link = selected.link || "";
    console.log("coords1", document.getElementById("shopName").dataset.coords);
    console.log("저장된 좌표:", document.getElementById("shopName").dataset.coords);
    console.log("저장된 링크:", document.getElementById("shopName").dataset.link);

    window.close();
};

async function addRestaurant() {
    const name = document.getElementById("name").value;
    console.log("name:", name);
    if (!name) {
        console.log("name 값이 비어있습니다:", name);
        alert("먼저 가게를 검색해서 선택해주세요!");
        return;
    }

    const lat = document.getElementById("lat").value;
    const lng = document.getElementById("lng").value;

    if (!lat || !lng) {
        console.error("좌표가 입력되지 않았습니다:", { lat, lng });
        alert("좌표가 설정되지 않았습니다. 가게를 검색해주세요!");
        return;
    }

    const newRestaurant = {
        category: document.getElementById("category").value,
        name: name,
        rating: document.getElementById("rating").value || "0",
        lat: lat,
        lng: lng,
        capacity: document.getElementById("capacity").value || "0",
        link: document.getElementById("shopName").dataset.link || ""
    };

    console.log("추가할 레스토랑:", newRestaurant);

    try {
        const response = await fetch("http://localhost:8080/restaurants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRestaurant)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "서버 저장 실패");
        }

        const updatedData = await response.json();
        restaurantsData = updatedData;
        console.log("서버에서 업데이트된 데이터:", restaurantsData);

        updateCategorySelect();
        closeAddModal();

        const csv = Papa.unparse(restaurantsData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "restaurants_updated.csv";
        link.click();
    } catch (error) {
        console.error("서버 저장 중 오류:", error);
        alert("서버 저장에 실패했습니다: " + error.message);
    }
}
