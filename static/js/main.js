// Skapa en Leaflet-karta i HTML-elementet med id "map"
const map = L.map("map");

// Funktion för att centrera kartan till vald landningsbas
const centerMapToStartBase = () => {
  const startICAO = document.getElementById("start").value;
  const startAirbase = airbases.find((base) => base.ICAO === startICAO);

  if (startAirbase) {
    map.setView([startAirbase.latitude, startAirbase.longitude], 6);
  } else {
    map.setView([58.4265, 12.7133], 6);
  }
};

// Lägg till en baslager-tile (t.ex. OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let routeData = []; // Array för att lagra alla objekt för varje rad
let serverRoutes = [];

const popup = L.popup();

const updateVisibility = () => {
  const currentDate = document.getElementById("date").value;
  serverRoutes.forEach((route) => {
    route.visible = route.date === currentDate;
  });
  updateMap();
  displayRoutes();
};

// Funktion för att hantera uppdatering av en route
const updateRouteOnServer = async (id, updatedRoute) => {
  try {
    const response = await fetch(`/routes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedRoute),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Route updated:", data);
      loadRouteDataFromServer(); // Ladda om data från servern
    } else {
      console.error("Failed to update route");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

// Funktion för att hantera borttagning av en route
const deleteRouteFromServer = async (id) => {
  try {
    const response = await fetch(`/routes/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      console.log("Route deleted");
      loadRouteDataFromServer(); // Ladda om data från servern
    } else {
      console.error("Failed to delete route");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

const displayRoutes = () => {
  const routesList = document.getElementById("routes-list");
  routesList.innerHTML = "";

  const selectedDate = document.getElementById("date").value;

  serverRoutes
    .filter((route) => route.date === selectedDate)
    .forEach((route) => {
      const routeRow = document.createElement("div");
      routeRow.className = "route-row";
      routeRow.style.border = `1px solid ${route.color}`; // Lägg till en tunn linje runt varje route-row med färgen från dess route

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = route.visible;
      checkbox.addEventListener("change", () => {
        route.visible = checkbox.checked;
        updateMap();
      });

      const routeInfo = document.createElement("span");
      routeInfo.textContent = `Callsign: ${route.callsign}, Units: ${route.units}, Phone: ${route.phone}, Date: ${route.date}, Time: ${route.time}`;

      const editButton = document.createElement("button");
      editButton.textContent = "Ändra";
      editButton.onclick = () => {
        routeInfo.innerHTML = `
                Callsign: <input type="text" value="${route.callsign}" id="edit-callsign-${route.id}">,
                Units: <input type="number" value="${route.units}" id="edit-units-${route.id}" min="1">,
                Phone: <input type="tel" value="${route.phone}" id="edit-phone-${route.id}">,
                Date: <input type="date" value="${route.date}" id="edit-date-${route.id}">
                Time: <input type="time" value="${route.time}" id="edit-time-${route.id}">
            `;
        editButton.style.display = "none";
        deleteButton.style.display = "none";
        saveButton.style.display = "inline";
      };

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Ta bort";
      deleteButton.onclick = async () => {
        await deleteRouteFromServer(route.id);
      };
      //TODO Save-knappen fudnerar ej som det är tänkt. Har inte testat delete än.
      const saveButton = document.createElement("button");
      saveButton.textContent = "Spara";
      saveButton.style.display = "none";
      saveButton.onclick = async () => {
        const updatedRoute = {
          callsign: document.getElementById(`edit-callsign-${route.id}`).value,
          units: parseInt(
            document.getElementById(`edit-units-${route.id}`).value,
            10
          ),
          phone: document.getElementById(`edit-phone-${route.id}`).value,
          date: document.getElementById(`edit-date-${route.id}`).value,
          time: document.getElementById(`edit-time-${route.id}`).value,
        };
        await updateRouteOnServer(route.id, updatedRoute);
      };

      routeRow.appendChild(checkbox);
      routeRow.appendChild(routeInfo);
      routeRow.appendChild(editButton);
      routeRow.appendChild(saveButton);
      routeRow.appendChild(deleteButton);
      routesList.appendChild(routeRow);
    });
};

const getCoordinatesFromRouteData = () => {
  const coordinates = routeData.map((newPoint) => [
    newPoint.lat,
    newPoint.long,
  ]);
  return coordinates;
};

const drawLineOnMap = () => {
  // Ta bort alla befintliga polylinjer från kartan
  map.eachLayer((layer) => {
    if (layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });

  const startICAO = document.getElementById("start").value;
  const landingICAO = document.getElementById("landing").value;

  const startAirbase = airbases.find((base) => base.ICAO === startICAO);
  const landingAirbase = airbases.find((base) => base.ICAO === landingICAO);

  // Rita polylinjer för varje route i serverRoutes
  serverRoutes.forEach((route) => {
    if (route.visible && route.waypoints && Array.isArray(route.waypoints)) {
      const serverCoordinates = route.waypoints.map((point) => [
        point.lat,
        point.long,
      ]);

      if (route.start && route.landing) {
        const routeStartAirbase = airbases.find(
          (base) => base.ICAO === route.start
        );
        const routeLandingAirbase = airbases.find(
          (base) => base.ICAO === route.landing
        );

        if (routeStartAirbase && routeLandingAirbase) {
          // Lägg till streck från startpunkt till första waypoint
          if (serverCoordinates.length > 0) {
            serverCoordinates.unshift([
              routeStartAirbase.latitude,
              routeStartAirbase.longitude,
            ]);
          }

          // Lägg till streck från sista waypoint till landningspunkt
          if (serverCoordinates.length > 1) {
            serverCoordinates.push([
              routeLandingAirbase.latitude,
              routeLandingAirbase.longitude,
            ]);
          }
        }
      }

      L.polyline(serverCoordinates, { color: route.color }).addTo(map);
    }
  });

  // Rita polylinje för routeData
  const coordinates = getCoordinatesFromRouteData();

  if (startAirbase && landingAirbase) {
    // Lägg till streck från startpunkt till första waypoint
    if (coordinates.length > 0) {
      coordinates.unshift([startAirbase.latitude, startAirbase.longitude]);
    }

    // Lägg till streck från sista waypoint till landningspunkt
    if (coordinates.length > 1) {
      coordinates.push([landingAirbase.latitude, landingAirbase.longitude]);
    }
  }

  L.polyline(coordinates, { color: "blue" }).addTo(map);
};

const createCustomIcon = (color) => {
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24px" height="24px">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
        `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const makeMarkersOnMap = () => {
  // Ta bort alla befintliga markörer från kartan
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Lägg till nya markörer från routeData på kartan
  const startICAO = document.getElementById("start").value;
  const landingICAO = document.getElementById("landing").value;

  const startAirbase = airbases.find((base) => base.ICAO === startICAO);
  const landingAirbase = airbases.find((base) => base.ICAO === landingICAO);

  if (startAirbase) {
    L.marker([startAirbase.latitude, startAirbase.longitude], {
      icon: createCustomIcon("blue"),
    })
      .bindPopup(`Startplats: ${startAirbase.name}`)
      .addTo(map);
  }

  if (landingAirbase && landingICAO !== startICAO) {
    L.marker([landingAirbase.latitude, landingAirbase.longitude], {
      icon: createCustomIcon("blue"),
    })
      .bindPopup(`Landningsplats: ${landingAirbase.name}`)
      .addTo(map);
  }
  routeData.forEach((point) => {
    point.marker = L.marker([point.lat, point.long], { draggable: true }).addTo(
      map
    );
    point.marker.bindPopup(
      "Lat: " + point.lat.toFixed(6) + "<br>" + "Long: " + point.long.toFixed(6)
    );
    point.marker.bindTooltip(point.name, {
      permanent: true,
      direction: "right",
    });
    point.marker.on("dragend", (e) => {
      const newPosition = e.target.getLatLng();
      point.lat = newPosition.lat;
      point.long = newPosition.lng;
      console.log("Marker dragged to lat:", point.lat, "and long:", point.long);
      updateMap();
    });
  });

  // Lägg till nya markörer från serverRoutes på kartan
  serverRoutes.forEach((route) => {
    if (route.visible && route.waypoints && Array.isArray(route.waypoints)) {
      const routeStartAirbase = airbases.find(
        (base) => base.ICAO === route.start
      );
      const routeLandingAirbase = airbases.find(
        (base) => base.ICAO === route.landing
      );

      if (routeStartAirbase) {
        L.marker([routeStartAirbase.latitude, routeStartAirbase.longitude], {
          icon: createCustomIcon(route.color),
        })
          .bindPopup(`Startplats: ${routeStartAirbase.name}`)
          .addTo(map);
      }

      if (routeLandingAirbase && route.landing !== route.start) {
        L.marker(
          [routeLandingAirbase.latitude, routeLandingAirbase.longitude],
          { icon: createCustomIcon(route.color) }
        )
          .bindPopup(`Landningsplats: ${routeLandingAirbase.name}`)
          .addTo(map);
      }

      route.waypoints.forEach((point) => {
        L.marker([point.lat, point.long], {
          icon: createCustomIcon(route.color),
        })
          .bindPopup(
            `${point.name}<br>Tid vid wp: ${point.time_at_waypoint}<br>Altitude: ${point.altitude}`
          )
          .addTo(map);
        //TODO Bind marker
      });
    }
  });
};

const handleInputUpdate = (event, attribute, updateFunction) => {
  if (event.key === "Enter" || event.type === "blur") {
    console.log("Enter har tryckts i " + attribute);
    const rowIndex = event.target.parentNode.parentNode.rowIndex;
    const value = event.target.value;
    for (let i = rowIndex; i < routeData.length; i++) {
      if (routeData[i][attribute] === null) {
        updateFunction(routeData[i], attribute, value);
      } else {
        break;
      }
    }
    addObjectsToThead();
  }
};

const updateAttribute = (object, attribute, value) => {
  object[attribute] = value;
};

const addObjectsToThead = () => {
  const table = document.querySelector("#route-table tbody");
  table.innerHTML = "";

  const previousPointWithValues = routeData.find(
    (point) => point.speed !== null || point.altitude !== null
  );
  let previousSpeed = previousPointWithValues
    ? previousPointWithValues.speed
    : null;
  let previousAltitude = previousPointWithValues
    ? previousPointWithValues.altitude
    : null;

  routeData.forEach((point, index) => {
    const newRow = table.insertRow();

    const nameCell = newRow.insertCell();
    nameCell.textContent = `WP ${index + 1}`;
    point.name = nameCell.textContent;

    const coordinateCell = newRow.insertCell();
    coordinateCell.textContent = `${point.lat.toFixed(4)}, ${point.long.toFixed(
      4
    )}`;

    const speedCell = newRow.insertCell();
    const speedInput = document.createElement("input");
    speedInput.type = "text";
    speedInput.className = "form-input";
    speedInput.placeholder = "Ange fart (kt)";
    speedInput.value =
      point.speed !== null
        ? point.speed
        : previousSpeed !== null
        ? previousSpeed
        : "";
    speedInput.id = "speedInputId";
    speedInput.oninput = () => {
      point.speed = speedInput.value;
      console.log(routeData);
    };
    speedInput.addEventListener("keyup", (event) =>
      handleInputUpdate(event, "speed", updateAttribute)
    );
    speedInput.addEventListener("blur", (event) =>
      handleInputUpdate(event, "speed", updateAttribute)
    );
    speedCell.appendChild(speedInput);

    const altitudeCell = newRow.insertCell();
    const altitudeInput = document.createElement("input");
    altitudeInput.type = "text";
    altitudeInput.className = "form-input";
    altitudeInput.placeholder = "Ange höjd (ft)";
    altitudeInput.value =
      point.altitude !== null
        ? point.altitude
        : previousAltitude !== null
        ? previousAltitude
        : "";
    altitudeInput.id = "altitudeInputId";
    altitudeInput.oninput = () => {
      point.altitude = altitudeInput.value;
      console.log(routeData);
    };
    altitudeInput.addEventListener("keyup", (event) =>
      handleInputUpdate(event, "altitude", updateAttribute)
    );
    altitudeInput.addEventListener("blur", (event) =>
      handleInputUpdate(event, "altitude", updateAttribute)
    );
    altitudeCell.appendChild(altitudeInput);

    const actionsCell = newRow.insertCell();
    const removeButton = document.createElement("button");
    removeButton.textContent = "Ta bort";
    removeButton.onclick = () => {
      const index = routeData.indexOf(point);
      if (index !== -1) {
        observableRouteData.splice(index, 1);
      }
    };
    actionsCell.appendChild(removeButton);

    previousSpeed = point.speed;
    previousAltitude = point.altitude;
  });
};

const updateMap = () => {
  makeMarkersOnMap();
  drawLineOnMap();
  addObjectsToThead();
};

const observableRouteData = new Proxy(routeData, {
  set: (target, property, value) => {
    target[property] = value;
    updateMap();
    return true;
  },
});

const observableServerData = new Proxy(serverRoutes, {
  set: (target, property, value) => {
    target[property] = value;
    if (property !== "length") {
      updateMap();
    }
    return true;
  },
});

const makePointObject = (lat, long) => {
  const newPoint = {
    name: "WPUndef",
    lat: lat,
    long: long,
    speed: null,
    altitude: null,
    marker: null,
  };
  observableRouteData.push(newPoint);
  console.log(routeData);
  console.log(observableRouteData);
};

const onMapClick = (e) => {
  makePointObject(e.latlng.lat, e.latlng.lng);
};

map.on("click", onMapClick);

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

  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const prevDateButton = document.getElementById("prev-date");
  const nextDateButton = document.getElementById("next-date");
  const startDropdown = document.getElementById("start");
  const landingDropdown = document.getElementById("landing");

  let currentStart = startDropdown.value;
  let currentLanding = landingDropdown.value;

  // Eventlyssnare för start- och landningsrullmenyerna
  startDropdown.addEventListener("change", () => {
    const newStart = startDropdown.value;
    if (newStart !== currentStart) {
      currentStart = newStart;
      updateMap();
      centerMapToStartBase();
    }
  });

  landingDropdown.addEventListener("change", () => {
    const newLanding = landingDropdown.value;
    if (newLanding !== currentLanding) {
      currentLanding = newLanding;
      updateMap();
    }
  });

  // Sätt standardvärden för datum och tid
  const today = new Date();
  dateInput.value = today.toISOString().substr(0, 10);
  timeInput.value = today.toTimeString().substr(0, 5);

  // Funktion för att justera datum
  const adjustDate = (days) => {
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    dateInput.value = currentDate.toISOString().substr(0, 10);
    updateVisibility();
  };

  // Eventlyssnare för datumknapparna
  prevDateButton.addEventListener("click", () => adjustDate(-1));
  nextDateButton.addEventListener("click", () => adjustDate(1));

  // Uppdatera synlighet för rutter baserat på datum vid sidladdning
  updateVisibility();
  centerMapToStartBase();
});

//TODO Gör en input check så att bara siffror kan läggas in i inputfältet

//TODO Refaktorera kod för speed och altitude

//TODO VIsa popup med tider för router på server
