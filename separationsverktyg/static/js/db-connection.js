const colors = [
  "#FF5733",
  "#FFBD33",
  "#DBFF33",
  "#75FF33",
  "#33FF57",
  "#33FFBD",
  "#33DBFF",
  "#3375FF",
  "#5733FF",
  "#BD33FF",
  "#FF33DB",
  "#FF3375",
  "#FF3333",
  "#FF5733",
  "#FFC300",
  "#DAF7A6",
  "#FF5733",
  "#C70039",
  "#900C3F",
  "#581845",
];

let airbases = [];

const getColor = (index) => colors[index % colors.length];

const saveRouteDataToServer = async () => {
  try {
    const routeInfo = {
      date: document.getElementById("date").value,
      time: document.getElementById("time").value,
      callsign: document.getElementById("callsign").value,
      units: parseInt(document.getElementById("units").value, 10),
      phone: document.getElementById("phone").value,
      start: document.getElementById("start").value,
      landing: document.getElementById("landing").value,
      waypoints: routeData.map((point) => ({
        name: point.name,
        lat: point.lat,
        long: point.long,
        speed: point.speed,
        altitude: point.altitude,
      })),
    };

    console.log("RouteInfo: ", routeInfo);

    const response = await fetch("/routes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(routeInfo),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Success:", data);
      observableRouteData.length = 0; // Töm arrayen
      loadRouteDataFromServer(); // Ladda om data från servern
    } else {
      console.error("Failed to save route data");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

const loadRouteDataFromServer = async () => {
  try {
    const response = await fetch("/routes", { method: "GET" });
    const data = await response.json();
    const user = data.user; // Extract the user data
    const routes = data.routes; // Extract the routes data
    const today = document.getElementById("date").value;
    const routesWithAttributes = routes.map((route, index) => ({
      ...route,
      color: getColor(index),
      visible: route.date === today,
    }));

    observableServerData.length = 0;
    routesWithAttributes.forEach((route, index) => {
      observableServerData[index] = route;
    });

    console.log("Alla data från servern: ", observableServerData);
    updateVisibility();
  } catch (error) {
    console.error("Error:", error);
  }
};

const loadAirbaseData = async () => {
  try {
    const response = await fetch("/static/airbases.json");
    airbases = await response.json();
    populateDropdown("start", airbases);
    populateDropdown("landing", airbases);
  } catch (error) {
    console.error("Error loading airbase data:", error);
  }
};

const populateDropdown = (dropdownId, options) => {
  const dropdown = document.getElementById(dropdownId);
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.ICAO;
    opt.textContent = option.name;
    dropdown.appendChild(opt);
  });
};

// Lägg till knappar för att spara och ladda ruttdata
document.addEventListener("DOMContentLoaded", () => {
  const login = async () => {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      console.log("Logged in successflly");
    } else {
      console.error("Gick inte att logga in");
    }
  };
  login();

  const saveButton = document.createElement("button");
  saveButton.textContent = "Spara ruttdata";
  saveButton.onclick = async () => {
    const message = await saveRouteDataToServer();
    console.log(message);
    if (message === "Success") {
      observableRouteData.length = 0;
      loadRouteDataFromServer();
    }
  };
  document.body.appendChild(saveButton);
  loadRouteDataFromServer();

  // const loadButton = document.createElement('button');
  // loadButton.textContent = 'Ladda ruttdata';
  // loadButton.onclick = loadRouteDataFromServer;
  // document.body.appendChild(loadButton);

  loadAirbaseData();
});
