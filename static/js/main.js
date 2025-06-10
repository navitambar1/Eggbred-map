let isMapLoaded = false;
let map;
let featureLayer;
let showPostalCodes = true; 
let lastInteractedFeatureIds = [];
let isAreaDevClicked = false;
let isRecruitmentClicked = false;
let selectedRegions = new Map();
let selectedRegionsRecruitment = new Map();
let labels = [];
let labelsRecruitment = []
let overlays = [];
let overlaysRecruitment = []
let all_place_ids = []
let selectedRegionGroups = new Map();
let selectedRegionGroupsRecruitment = new Map();
let currentGroupId = 0;
let currentGroupIdRecruitment = 0;
let selectedGroupForDeletion = null;
let selectedGroupForDeletionRecruitment = null;
let newSelectedRegions = [];
let newSelectedRegionsRecruitment = [];
let selectedColor = 'grey';
let selectedColorRecruitment = 'grey';
let labelOverlays = [];
let labelOverlaysRecruitment = [];
let currentCenter, currentZoom;
let selectedRegionsDemographics = new Map();
let selectedRegionsRecruitmentDemographics = new Map();
let areColorsVisible = true;
let areColorsVisibleRecruitment = true;
let selectedClassificationText = '';
let selectedClassificationTextRecruitment = '';
let prefix = "";
let prefixRecruitment = "";
let isEditingArea = false;
let isEditingAreaRecruit = false;
let editingGroupId = null;
let editingGroupIdRecruit = null;
let originalRegions = [];
let originalRegionsRecruit = [];
var data_list = [];
var data_list_recruit = [];
let regionPolygons = [];
let regionPolygonRecruit = [];
let areRegionsVisible = true;
let areRegionsVisibleRecruit = true;
let areRadialLabelsVisible = true;
let isCreatingNewArea = false;
let isCreatingNewAreaRecruitment = false;
let autocomplete1;
let  lastSelectedPlace = null; 

let selectedRegionsRadial = new Map();
let labelsRadial = [];
let overlaysRadial = [];
let selectedRegionGroupsRadial = new Map();
let currentGroupIdRadial = 0;
let selectedGroupForDeletionRadial = null;
let newSelectedRegionsRadial = [];
let selectedColorRadial = 'grey';
let labelOverlaysRadial = [];
let isCustomMapLoadedRadial = false;
let currentCenterRadial, currentZoomRadial;
let selectedRegionsDemographicsRadial = new Map();
let areColorsVisibleRadial = true;
let selectedClassificationTextRadial = '';
let autocompleteInput = '';
let prefixRadial = "";
let isEditingAreaRadial = false;
let editingGroupIdRadial = null;
let selectedCircle = null
let autocomplete;
let isFeatureLayerActive = false;
let circles = new Map();
let selectedLocation = null;
let selectedLocationSearch = null;
let activeCircle = null;
let activeCircleId = null;
let accumulatedData = null;
let selectedCircleId = null;
const circleData = JSON.parse(localStorage.getItem('mapCircles')) || [];
let currentMarker = null;
let currentMarkerSearch = null;
let originalRadius = null;
let hasUnsavedChanges = false;
let isCircleSaved = false;

export function init() {
    // Call initNormalMap or any other initialization function you need
    initNormalMap();
}

function loadSavedRegions() {
    if (isAreaDevClicked) { 
        if (areRegionsVisible) {
            $.ajax({
                url: "/load_regions",
                method: "GET",
                success: function(response) {
                    if (response.status === 'success') {
                        const savedRegions = response.regions || [];
                        const savedGroups = response.regionGroups || [];
                        selectedRegions.clear();
                        selectedRegionGroups.clear();
                        
                        savedRegions.forEach(region => {
                            selectedRegions.set(region.placeId, {
                                ...region,
                                displayName: region.displayName || `Feature ${region.placeId}`,
                                type: 'areaDev' 
                            });
                        });
                        savedGroups.forEach(group => {
                            const groupRegions = savedRegions.filter(region => region.groupId === group.id);
                            const demographics = typeof group.demographics === "string"
                                ? JSON.parse(group.demographics)
                                : group.demographics;
                            
                            selectedRegionGroups.set(group.id, {
                                ...group,
                                regions: groupRegions.map(region => region.placeId),
                                demographics: demographics,
                                type: 'areaDev'
                            });
                        });

                        currentGroupId = Math.max(...selectedRegionGroups.keys(), 0) + 1;
                        updateAreaDevLabels();

                        // ✅ Force Redraw to Show Polygons
                        refreshFeatureLayer(); 
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching area development regions:", error);
                }
            });
        }
    }
    if (isRecruitmentClicked) {
        $.ajax({
            url: "/load_regions_recruitment",
            method: "GET",
            success: function(response) {
                if (response.status === 'success') {
                    const savedRegions = response.regions || [];
                    const savedGroups = response.regionGroups || [];
                    selectedRegionsRecruitment.clear();
                    selectedRegionGroupsRecruitment.clear();
                    savedRegions.forEach(region => {
                        selectedRegionsRecruitment.set(region.placeId, {
                            ...region,
                            displayName: region.displayName || `Feature ${region.placeId}`,
                            type: 'recruitment'
                        });
                    });
                    savedGroups.forEach(group => {
                        const groupRegions = savedRegions.filter(region => region.groupId === group.id);
                        const demographics = typeof group.demographics === "string"
                            ? JSON.parse(group.demographics)
                            : group.demographics;
                        selectedRegionGroupsRecruitment.set(group.id, {
                            ...group,
                            regions: groupRegions.map(region => region.placeId),
                            demographicsRec: demographics,
                            type: 'recruitment'
                        });
                    });
                    currentGroupIdRecruitment = Math.max(...selectedRegionGroupsRecruitment.keys(), 0) + 1;
                    updateRecruitmentLabels();
		            refreshFeatureLayer();
                }
            },
            error: function(xhr, status, error) {
                console.error("Error fetching recruitment regions:", error);
            }
        });
    }
}
function refreshFeatureLayer() {
    if (featureLayer) {
        featureLayer.style = createApplyStyle(styleDefaultNormalmap);
        google.maps.event.trigger(map, "idle");
    }
}

async function loadSavedCircles() {
    try {
        const response = await fetch('/get_all_circles');
        const result = await response.json();
        if (result.status === 'success') {
            const serverCircles = result.data;
            Object.entries(serverCircles).forEach(([id, data]) => {
                const center = new google.maps.LatLng(data.center.lat, data.center.lng);
                const circle = new google.maps.Circle({
                    map: map,
                    center: center,
                    radius: data.radius,
                    fillColor: data.color,
                    fillOpacity: 0.2,
                    strokeColor: data.color,
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    id: id
                });
                const label = new google.maps.Marker({
                    position: center,
                    map: map,
                    label: {
                        text: data.name,
                        color: 'black',
                        fontWeight: "700",
                        fontSize: "14px",
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 0
                    }
                });
                circles.set(id, {
                    circle: circle,
                    label: label,
                    data: data
                });
                circle.addListener("click", () => {
                    activeCircle = circle;
                    activeCircleId = id;
                    // showInputPanel();
                    document.getElementById("submit-btn-radial").style.display = "none";
                    populateTableForCircle(id);
                });
            });
            // setupMapClickListener();
        } else {
            console.error('Error fetching circles from server:', result.message);
        }
    } catch (error) {
        console.error('Error during fetch:', error);
    }
}
// Action button event listner for Area development
function actionBtn() {
    document.getElementById("ActionBtn").addEventListener("click", function(){
        document.getElementById("franchiseViewRight").style.display = "block";
        document.getElementById("demographic-table").style.display = "none";
    })
}
// Close button event listner for Area development
function closeBtn() {
    document.getElementById("CloseBtn").addEventListener("click", function(){
        selectedGroupForDeletion = null;
        highlightSelectedGroup();
        document.getElementById("demographic-table").style.display = "none";
    })
}
// "Go Back" button event listner for Area development
function GoBackToTableFranchise() {
    document.getElementById("BackToTableFranchise").addEventListener("click", function(){
        document.getElementById("demographic-table").style.display = "block";
        document.getElementById("franchiseViewRight").style.display = "none";
    })
}
// Function to add data demographic table rows on right panel for area development
function displayGroupDemographics(demographics) {
    const table = document.getElementById('demographicTable');
    const tbodies = table.getElementsByTagName('tbody');
    const rows = [];

    for (let tbody of tbodies) {
        for (let row of tbody.getElementsByTagName('tr')) {
            rows.push(row);
        }
    }
    const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    for (let row of rows) {
        const label = row.cells[0].textContent.trim();
        const valueCell = row.cells[1];

        switch(label) {
            case 'Population':
                valueCell.textContent = formatNumber(demographics.population);
                break;
            case 'Households':
                valueCell.textContent = formatNumber(demographics.total_households);
                break;
            case 'Households Less Than $10,000 (Est)':
                valueCell.textContent = formatNumber(demographics.income_less_than_10k);
                break;
            case 'Household Income - $10,000 to $14,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_10k_15k);
                break;
            case 'Household Income - $15,000 to $24,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_15k_25k);
                break;
            case 'Household Income - $25,000 to $34,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_25k_35k);
                break;
            case 'Household Income - $35,000 to $49,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_35k_50k);
                break;
            case 'Household Income - $50,000 to $74,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_50k_75k);
                break;
            case 'Household Income - $75,000 to $99,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_75k_100k);
                break;
            case 'Household Income - $100,000 to $149,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_100k_150k);
                break;
            case 'Household Income - $150,000 to $199,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_150k_200k);
                break;
            case 'Household Income - $200,000 and over (Est)':
                valueCell.textContent = formatNumber(demographics.income_200k_plus);
                break;
            default:
                valueCell.textContent = '0';
        }
    }
}

//  Fuction to handle style on Mouse Move for Area development
function handleMouseMove(e) {
    lastInteractedFeatureIds = e.features.map((f) => f.placeId);
    featureLayer.style = applyStyle;
}
// Init function to load map on page load for area development and recruitment analysis
async function initNormalMap() {
    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map-container"), {
        center: { lat: 39.0928, lng: -95.8143 },
        zoom: 6,
        mapTypeControl: false,
        mapId: "ade4782d096b4576",
        gestureHandling: "greedy"
    });

    currentCenter = map.getCenter();
    currentZoom = map.getZoom();
    map.addListener("center_changed", () => {
        currentCenter = map.getCenter();
    });

    featureLayer = map.getFeatureLayer("POSTAL_CODE");
    featureLayer.style = createApplyStyle(styleDefaultNormalmap);
    featureLayer.addListener("click", handleClick);

    document.getElementById("editAreaBoundry").addEventListener("click", function() {
        initCustomMap();
        handleEditArea();
    });
    document.getElementById("editAreaBoundryRecruitment").addEventListener("click", function() {
        initCustomMap();
        handleEditAreaRecruitment();
    });
    handleDelete();
    handleDeleteRecruitment();
    initializeEventListeners();
    addControlListeners();
    if (isMapLoaded) {
        updateLabels();
    }
    if (localStorage.getItem('loadSavedRegionsFlag') === 'true') {
        loadSavedRegions();
    }                             
    if (localStorage.getItem('isAreaDevClicked') === 'true') {
        isAreaDevClicked = true;  
        loadSavedRegions();
        localStorage.setItem('isAreaDevClicked', 'false');  
    }
    if (localStorage.getItem('isRecruitmentClicked') === 'true') {
        isRecruitmentClicked = true;  
        loadSavedRegions();
        localStorage.setItem('isRecruitmentClicked', 'false'); 
    }
    if (localStorage.getItem('leftPanelActive') === 'true') {
        $('#leftPanel').addClass('active');
        localStorage.setItem('leftPanelActive', 'false'); 
    }
    google.maps.event.addDomListener(window, 'load', () => {
        initializePostalCodeOverlay();  
    });
    
}
// Init function with postal layer configuration for area development and recruitment analysis
async function initCustomMap() {
    showPostalCodes = true;
    if (isAreaDevClicked ) {
        customMapStyling();
    }
    if (isRecruitmentClicked) {
        customMapStylingRecruit();
    }
}
async function customMapStyling() {
    document.getElementById('loader-wrapper').style.display = 'block';
    currentCenter = currentCenter;
    currentZoom = currentZoom || 15;
    
    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map-container"), {
        center: currentCenter,
        zoom: currentZoom,
        mapId: "ade4782d096b4576",
        gestureHandling: "greedy",
        mapTypeControl: false,
        minZoom: 10.5,
    });
    featureLayer = map.getFeatureLayer("POSTAL_CODE");
    featureLayer.style = isEditingArea ? createNewAreaStyle : applyStyle;
    featureLayer.addListener("click", handleClick);
    featureLayer.addListener("mousemove", handleMouseMove);
    map.addListener("idle", () => {
        const bounds = map.getBounds();
        if (bounds && showPostalCodes) { // Only display if flag is true
            all_place_ids = get_all_place_ids();
            displayVisiblePlaceIds(bounds);
        }
    });
    setTimeout(() => {
        document.getElementById('loader-wrapper').style.display = 'none';
    }, 2000);
    loadSavedRegions();
    initializeEventListeners();
    addControlListeners();
    customMapEventsFranchise();
    CustomMapEventRecruitment();
}
async function customMapStylingRecruit() {
    document.getElementById('loader-wrapper').style.display = 'block';
    currentCenter = currentCenter;
    currentZoom = currentZoom || 15;
    
    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map-container"), {
        center: currentCenter,
        zoom: currentZoom,
        mapId: "ade4782d096b4576",
        gestureHandling: "greedy",
        mapTypeControl: false,
        minZoom: 10.5,
    });

    featureLayer = map.getFeatureLayer("POSTAL_CODE");
    
    // Conditional styling based on whether we are editing the area or not
    featureLayer.style = isEditingAreaRecruit ? createNewAreaStyle : applyStyle;
    featureLayer.addListener("click", handleClick);
    featureLayer.addListener("mousemove", handleMouseMove);
    
    map.addListener("idle", () => {
        const bounds = map.getBounds();
        if (bounds && showPostalCodes) { // Only display if flag is true
            all_place_ids = get_all_place_ids();
            displayVisiblePlaceIds(bounds);
        }
    });
    setTimeout(() => {
        document.getElementById('loader-wrapper').style.display = 'none';
    }, 2000);
    loadSavedRegions();
    initializeEventListeners();
    addControlListeners();
    customMapEventsFranchise();
    CustomMapEventRecruitment();
}

// Area development submit, input and demographic buttons evenet listner
function customMapEventsFranchise() {
    document.getElementById('submit-btn').addEventListener('click', function() {
        handleSubmit();
        hide_demographic_table();
    });
    document.getElementById("DeleteLayerButton").addEventListener("click", handleDelete);
    document.getElementById("createNewAreaBtn").addEventListener("click", function() {
        initCustomMap();
        var table = document.getElementById('demographic-table');
        if (table.style.display === 'none' || table.style.display === '') {
            table.style.display = 'block';
            this.textContent = 'Hide Demographic Data';
        } else {
            table.style.display = 'none';
            this.textContent = 'Show Demographic Data';
        }
    });
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.getAttribute('data-color');
        let rgbValues;
        if (color === 'white') {
            rgbValues = '255,255,255';
        } else {
            rgbValues = color.match(/\d+,\d+,\d+/)[0];
        }
        option.style.setProperty('--hover-color', rgbValues);
        option.addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (!colorOption) return;

            document.querySelectorAll('.color-option').forEach(opt =>
                opt.classList.remove('selected')
            );
            colorOption.classList.add('selected');
            selectedColor = colorOption.dataset.color;
        });
        option.addEventListener('click', () => {
            selectedClassificationText = option.querySelector('p').textContent;
        });
    }); 
}
function CustomMapEventRecruitment() {
    document.getElementById('submit-btn-recruitment').addEventListener('click', function() {
        handleSubmitRecruitment();
        hide_demographic_table_Recruitment();
    });
    
    document.getElementById("save-btn-recruitment").addEventListener("click", handleSave);
    document.getElementById("createNewAreaBtnRecruitment").addEventListener("click", function() {
        initCustomMap();
        var table = document.getElementById('demographic-table-recruitment');
        if (table.style.display === 'none' || table.style.display === '') {
            table.style.display = 'block';
            this.textContent = 'Hide Demographic Data';
        } else {
            table.style.display = 'none';
            this.textContent = 'Show Demographic Data';
        }
    });
    
    // Modified color option event listeners
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.getAttribute('data-color');
        let rgbValues;
        if (color === 'white') {
            rgbValues = '255,255,255';
        } else {
            rgbValues = color.match(/\d+,\d+,\d+/)[0];
        }
        option.style.setProperty('--hover-color', rgbValues);
        
        option.addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (!colorOption) return;
            
            document.querySelectorAll('.color-option').forEach(opt =>
                opt.classList.remove('selected')
            );
            colorOption.classList.add('selected');
            const categoryText = document.querySelector('input[name="category"]:checked')?.value
            // Get the category text
            const selectedClassificationTextRecruitmentValue = colorOption.querySelector('p').textContent;
            if (categoryText === "Primary Area") {
                selectedColorRecruitment = "rgb(255, 255, 153)";
            } else if (categoryText === "Secondary Area") {
                selectedColorRecruitment = "rgb(230, 230, 0)";
            } else {
                selectedColorRecruitment = colorOption.dataset.color;
            }
            
            selectedClassificationTextRecruitment = selectedClassificationTextRecruitmentValue;
        });
    });
}
//  Function to clear area polygons from map
function clearMapElements() {
        overlays.forEach(overlay => overlay.setMap(null));
        labels.forEach(label => label.setMap(null));
        overlays = [];
        labels = [];
        regionPolygonRecruit.forEach(polygon => {
            if (polygon) polygon.setMap(null);
        });
        regionPolygonRecruit = [];
}
function clearMapElementsRecruitment() {
        overlaysRecruitment.forEach(overlay => overlay.setMap(null));
        labelsRecruitment.forEach(label => label.setMap(null));
        overlaysRecruitment = [];
        labelsRecruitment = [];
        regionPolygons.forEach(polygon => {
            if (polygon) polygon.setMap(null);
        });
        regionPolygons = [];
}
//  Function to clear area polygons from map with less handling
function clearMapRegions() {
        regionPolygonRecruit.forEach(polygon => {
            if (polygon) polygon.setMap(null);
        });
        regionPolygonRecruit = [];
        selectedRegions.clear();
        selectedRegionGroups.clear();
        currentGroupId = 1;
        if (typeof updateLabels === 'function') {
            updateLabels();
        }
}
function clearMapRegionsRecruitment() {
        regionPolygons.forEach(polygon => {
            if (polygon) polygon.setMap(null);
        });
        regionPolygons = [];
        selectedRegionsRecruitment.clear();
        selectedRegionGroupsRecruitment.clear();
        currentGroupIdRecruitment = 1;
        if (typeof updateLabels === 'function') {
            updateLabels();
        }
}

//  DOM function to handle all the buttons( Area developemnt, radial analysis and recruitment analysis) event listners.
function addControlListeners() {
        const searchModal = document.getElementById('searchModal');
        const searchIcon = document.getElementById('mnu-search');
        const closeModal = document.getElementById('closeModal');
        const submitButton = document.getElementById('searchSubmit');
        const franchiseTerritoriesBtn = document.getElementById('franchiseTerritoriesBtn');
        const franchiseControls = document.getElementById('franchiseControls');
        const defaultView = document.getElementById('defaultView');
        const franchiseView = document.getElementById('franchiseView');
        const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
        const menuBtn = document.getElementById('menuBtn');
        const backToLayerControlBtn = document.getElementById('backToLayerControlBtn');
        const createNewAreaBtn = document.getElementById('createNewAreaBtn');
        const dragBtn = document.getElementById('dragBtn');
        const mapElement = document.getElementById('map');
        const layerInfoView = document.getElementById('layerInfoViewFranchise');
        const layerInformationBtn = document.getElementById('layerInformationBtn');
        const backToFranchiseViewBtn = document.getElementById('backToFranchiseViewBtn');
        const DemographicTable = document.getElementById("demographic-table");
        const returnToMapFromTable = document.getElementById("returnToMapFromTable");
        const inputBtn = document.getElementById("input-area");
        const saveBackBtn = document.getElementById("save-back");
        
        const RadialAnalysisBtn = document.getElementById('RadialAnalysisBtn');
        const radialControls = document.getElementById('radialControls');
        const radialview = document.getElementById('radialview');
        const toggleLabelsBtnRadial = document.getElementById('toggleLabelsBtnRadial');
        const menuBtnRadial = document.getElementById('menuBtnRadial');
        const backToLayerControlBtnFromRadial = document.getElementById('backToLayerControlBtnFromRadial');
        const createNewAreaBtnRadial = document.getElementById('createNewAreaBtnRadial');
        const AddressInput = document.getElementById('address-input');
        const mapElementRadial = document.getElementById('map');
        const layerInfoViewRadial = document.getElementById('layerInfoViewRadial');
        const layerInformationBtnRadial = document.getElementById('layerInformationBtnRadial');
        const backToRadialViewBtn = document.getElementById('backToViewBtnRadial');
        const backToLayerControlFromHeatMappingBtnRadial = document.getElementById('backToLayerControlFromHeatMappingBtnRadial');
        const input = document.getElementById("autocomplete");
        const input_back_btn = document.getElementById("backToRadialControlFromAutoComplete");
        const SubmitButtonAutoComplete = document.getElementById("submitButtonAutoComplete");
        const demographicTableRadial = document.getElementById("demographic-table-radial");
        const submit_btnRadial = document.getElementById("submit-btn-radial");
        const RadialViewRight = document.getElementById("RadialViewRight");
        const inputBtnRadial = document.getElementById("input-area-radial");
        const SaveBackBtnRadial = document.getElementById("save-back-radial");
        const backToRadialviewBtn = document.getElementById("BackToTableRadial");
        const editradialnumber =  document.getElementById("editradialnumber");
        const editAreaBoundryRadial = document.getElementById("editAreaBoundryRadial");
        const backFromEditRadial = document.getElementById("backFromEditRadial");
        const DeleteLayerButtonRadial = document.getElementById("DeleteLayerButtonRadial");
        const saveBtnForRadius = document.getElementById("saveBtnForRadius");
        const radiusInput = document.getElementById('typeNumber');

        const recruitmentTerritoriesBtn = document.getElementById('recruitmentTerritoriesBtn');
        const recruitmentControls = document.getElementById('recruitmentControls');
        const recruitmentView = document.getElementById('recruitmentView');
        const toggleLabelsBtnrecruitment = document.getElementById('toggleLabelsBtnrecruitment');
        const menuBtnrecruitment = document.getElementById('menuBtnrecruitment');
        const backToLayerControlBtnRecruitment = document.getElementById('backToLayerControlBtnRecruitment');
        const createNewAreaBtnRecruitment = document.getElementById('createNewAreaBtnRecruitment');
        const dragBtnrecruitment = document.getElementById('dragBtnrecruitment');
        const layerInfoViewRecruitment = document.getElementById('layerInfoViewRecruitment');
        const layerInformationBtnRecruitment = document.getElementById('layerInformationBtnRecruitment');
        const backToViewBtnRecruitment = document.getElementById('backToViewBtnRecruitment');
        const DemographicTableRecruitment = document.getElementById("demographic-table-recruitment")
        const inputBtnRecruitment = document.getElementById("input-area-recruitment");
        const returnToMapRecruitmentFromTableRecruitment = document.getElementById("returnToMapRecruitmentFromTableRecruitment")
        const SaveBackBtnRecruitment = document.getElementById("save-back-recruitment");
        const returnToMapFromTableRecruitment = document.getElementById("returnToMapFromTableRecruitment");

        const colorOptions = document.querySelectorAll('.color-option');
        document.getElementById("DeleteLayerButtonRecruitment").addEventListener("click", function(){
            $('#delet-area').modal('show');
            handleDeleteRecruitment();
        });
        document.getElementById("DeleteLayerButton").addEventListener("click", function(){
            $('#delet-area').modal('show');
            handleDelete();
        });
        document.getElementById("DeleteLayerButtonRadial").addEventListener("click", function(){
            $('#delet-area').modal('show');
            handleDeleteRadial();
        });
        colorOptions.forEach(option => {
        option.addEventListener('click', function () {
            colorOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const color = this.getAttribute('data-color');
            this.style.backgroundColor = color;
        });
        });
        $('#mnu-layer-control').click(function() {
            $('#leftPanel').toggleClass('active');
        });
        if (returnToMapFromTable) {
            returnToMapFromTable.addEventListener("click", function() {
                document.getElementById("tableView").style.display = "none";
                document.getElementById("map-container").style.display = "block";
            });
        }
        function setupPlacesAutocomplete() {
            const searchInput = document.getElementById('autocomplete1');
            if (!searchInput) {
                console.error('Search input element not found');
                return;
            }
            searchInput.addEventListener('input', function() {
                if (autocomplete1) {
                    google.maps.event.clearInstanceListeners(autocomplete);
                    autocomplete1 = null;
                }
                if (this.value.length >= 3) {
                    autocomplete1 = new google.maps.places.Autocomplete(searchInput, {
                        types: ['address'],
                        fields: ['formatted_address', 'geometry']
                    });
                    autocomplete1.addListener('place_changed', function() {
                        const place = autocomplete1.getPlace();
                        if (place.geometry) {
                            const lat = place.geometry.location.lat();
                            const lng = place.geometry.location.lng();
                            selectedLocationSearch = { lat: lat, lng: lng };
                        }
                        if (!place.geometry) {
                            console.log("No location details available for input: '" + place.name + "'");
                            return;
                        }
                        lastSelectedPlace = place;
                    });
                }
            });
        }
        submitButton.addEventListener('click', function() {
            if (lastSelectedPlace && lastSelectedPlace.geometry) {
                if (map) {
                    map.setCenter(lastSelectedPlace.geometry.location);
                    map.setZoom(12);
                    searchModal.style.display = 'none';
                    if (currentMarkerSearch) {
                        currentMarkerSearch.setMap(null);
                        currentMarkerSearch = null;
                    }
                    currentMarkerSearch = new google.maps.Marker({
                        map: map,
                        position: selectedLocationSearch,
                        animation: google.maps.Animation.DROP
                    }); 
                    setTimeout(() => {
                        if (currentMarkerSearch) {
                            currentMarkerSearch.setMap(null);
                            currentMarkerSearch = null;
                        }
                    }, 10000); 
                }
            } else {
                alert('Please select a location from the dropdown first');
            }
        });
        searchIcon.onclick = function() {
            searchModal.style.display = 'block';
            setupPlacesAutocomplete();
        };
        closeModal.onclick = function() {
            searchModal.style.display = 'none';
            lastSelectedPlace = null;  
        };
        window.onclick = function(event) {
            if (event.target === searchModal) {
                searchModal.style.display = 'none';
                lastSelectedPlace = null;  
            }
        };
        if (mapElement) {
            mapElement.style.display = "block";
        }
        if (menuBtn && defaultView && franchiseView) {
            menuBtn.addEventListener('click', function() {
                defaultView.style.display = 'none';
                franchiseView.style.display = 'block';
            });
        }
        if (franchiseTerritoriesBtn) {
            franchiseTerritoriesBtn.addEventListener('click', async function() {
                console.log("clicked franchiseTerritoriesBtn");
                if (franchiseControls) {
                    isAreaDevClicked = !isAreaDevClicked;
                    franchiseControls.style.display = isAreaDevClicked ? 'flex' : 'none';
                    if (isAreaDevClicked) {
                        loadSavedRegions();
                    } else {
                        clearMapRegions();
                        labels.forEach(label => label.setMap(null));
                        labels = [];
                        selectedRegions.clear();
                        selectedRegionGroups.clear();
                        featureLayer.style = createApplyStyle(styleDefaultNormalmap);
                    }
                }
            });
        }
        if (backToLayerControlBtn && franchiseView && defaultView) {
            backToLayerControlBtn.addEventListener('click', function() {
                isAreaDevClicked = false;
                isCreatingNewArea = false;
                isEditingArea = false;
                isCreatingNewAreaRecruitment = false;
                isEditingAreaRecruit = false;
                selectedGroupForDeletion = null;
                highlightSelectedGroup()
                franchiseView.style.display = 'none';
                defaultView.style.display = 'block';
                franchiseControls.style.display = 'none';
                clearMapRegions();
                labels.forEach(label => label.setMap(null));
                labels = [];
                featureLayer.style = createApplyStyle(styleDefaultNormalmap);
                removePostalCodes();
                DemographicTable.style.display = "none";
                DemographicTableRecruitment.style.display = "none";
                DeleteLayerButtonRadial.style.display = "none";
                
            });
        }
        const hideColorsBtn = Array.from(document.querySelectorAll('.action-btn')).find(
            (el) => el.textContent.includes("Hide classification colours")
        );
        if (hideColorsBtn) {
            hideColorsBtn.addEventListener('click', () => toggleClassificationColors(hideColorsBtn));
        }
        if (toggleLabelsBtn) {
            toggleLabelsBtn.addEventListener('click', function() {
                const isLabelsOn = toggleLabelsBtn.textContent.includes('off');
                toggleLabelsBtn.textContent = isLabelsOn ? 'Turn labels on' : 'Turn labels off';
                areRegionsVisible = !isLabelsOn;
                if (areRegionsVisible) {
                    loadSavedRegions();
                    updateLabels();
                } else {
                    labels.forEach(label => label.setMap(null));
                    labels = [];
                }
                map.data.setStyle(applyStyle);
            });
        }
        if (createNewAreaBtn) {
            createNewAreaBtn.addEventListener('click', function() {
                initCustomMap();
            });
        }
        if (dragBtn) {
            dragBtn.addEventListener('dragstart', function(e) {
                e.target.style.opacity = '0.4';
                e.dataTransfer.setData('text/plain', e.target.id);
            });

            dragBtn.addEventListener('dragend', function(e) {
                e.target.style.opacity = '1';
            });
        }
        if (layerInformationBtn) {
            layerInformationBtn.addEventListener('click', function() {
                franchiseView.style.display = 'none';
                layerInfoView.style.display = 'block';
                renderPieChart();
            });
        }
        if (backToFranchiseViewBtn) {
            backToFranchiseViewBtn.addEventListener('click', function() {
                layerInfoView.style.display = 'none';
                franchiseView.style.display = 'block';
            });
        }
        const layerButtons = document.querySelector('.layer-buttons');
        if (layerButtons) {
            layerButtons.addEventListener('dragover', function(e) {
                e.preventDefault();
                const draggable = document.querySelector('.dragging');
                if (draggable) {
                    const afterElement = getDragAfterElement(layerButtons, e.clientY);
                    if (afterElement) {
                        layerButtons.insertBefore(draggable, afterElement);
                    } else {
                        layerButtons.appendChild(draggable);
                    }
                }
            });
        }
        if (saveBackBtn) {
            saveBackBtn.addEventListener("click", function() {
                DemographicTable.style.display = "block";
                inputBtn.style.display = "block";
                localStorage.setItem('isAreaDevClicked', 'true');
                finishSave();
            })
        }
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.layer-btn:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        document.getElementById('FranchiseNotes').addEventListener('click', function () {
        const notesModal = new bootstrap.Modal(document.getElementById('notesModal'));
        notesModal.show();
        });
        document.getElementById('radialNotes').addEventListener('click', function () {
        const notesModal = new bootstrap.Modal(document.getElementById('notesModal'));
        notesModal.show();
        });
        document.getElementById('RecruitmentNotes').addEventListener('click', function () {
        const notesModal = new bootstrap.Modal(document.getElementById('notesModal'));
        notesModal.show();
        });
        document.getElementById("show-more-btn").addEventListener("click", function () {
            const extraRows = document.getElementById("extra-rows");
            if (extraRows.style.display === "none") {
                extraRows.style.display = "";
                this.innerHTML = "⬆ Show Less";
            } else {
                extraRows.style.display = "none";
                this.innerHTML = "⬇ Show More";
            }
        });
        document.getElementById("show-more-btn-recruitment").addEventListener("click", function () {
            const extraRowsRec = document.getElementById("moreDemographics");
            if (extraRowsRec.style.display === "none") {
                extraRowsRec.style.display = "";
                this.innerHTML = "⬆ Show Less";
            } else {
                extraRowsRec.style.display = "none";
                this.innerHTML = "⬇ Show More";
            }
        });
        //////////////////////////////////////////////////////////////////////////////////////////////////
        if (DeleteLayerButtonRadial) {
            DeleteLayerButtonRadial.addEventListener("click", function(){
                $('#delet-area').modal('show');
                handleDeleteRadial();
            })
        }
        if (editAreaBoundryRadial) {
            editAreaBoundryRadial.addEventListener("click", function() {
                editradialnumber.style.display = "block";
                RadialViewRight.style.display = "none";
            })
        }
        if (backFromEditRadial) {
            backFromEditRadial.addEventListener("click", function() {
                editradialnumber.style.display = "none";
                RadialViewRight.style.display = "block";
            })
        }
        if (mapElementRadial) {
            mapElementRadial.style.display = "block";
        }
        if (RadialAnalysisBtn) {
            RadialAnalysisBtn.addEventListener('click', async function() {
                if (radialControls) {
                    radialControls.style.display = radialControls.style.display === 'none' ? 'flex' : 'none';

                    if (radialControls.style.display === 'flex') {
                        loadSavedCircles();
                        isFeatureLayerActive = !isFeatureLayerActive;
                    } else {
                        clearMapCircles();
                    }
                }
            });
        }
        if (backToRadialViewBtn) {
            backToRadialViewBtn.addEventListener('click', function() {
                layerInfoViewRadial.style.display = 'none';
                radialview.style.display = 'block';
            });
        }
        if (SaveBackBtnRadial) {
            SaveBackBtnRadial.addEventListener("click", function() {
                demographicTableRadial.style.display = "block";
                inputBtnRadial.style.display = "none";

            })
        }
        if (hideColorsBtn) {
            hideColorsBtn.addEventListener('click', () => toggleClassificationColorsRadial(hideColorsBtn));
        }
        if (toggleLabelsBtnRadial) {
            toggleLabelsBtnRadial.addEventListener('click', function() {
                const isLabelsOn = toggleLabelsBtnRadial.textContent.includes('off');
                toggleLabelsBtnRadial.textContent = isLabelsOn ? 'Turn labels on' : 'Turn labels off';
                areRadialLabelsVisible = !isLabelsOn;
                if (areRadialLabelsVisible) {
                    loadSavedCircles();
                    updateLabelsRadial();
                } else {
                    clearMapCircles();
                }
            });
        }
        if (menuBtnRadial && defaultView && radialview) {
            menuBtnRadial.addEventListener('click', function() {
                defaultView.style.display = 'none';
                radialview.style.display = 'block';
            });
        }
        if (backToLayerControlBtnFromRadial && radialview && defaultView) {
            backToLayerControlBtnFromRadial.addEventListener('click', function() {
                radialview.style.display = 'none';
                defaultView.style.display = 'block';
                radialControls.style.display = 'none';
                clearMapCircles();
                selectedCircleId = null;
                DemographicTable.style.display = "none";
                DemographicTableRecruitment.style.display = "none";
                demographicTableRadial.style.display = "none";
            });
        }
        if (backToLayerControlFromHeatMappingBtnRadial) {
            backToLayerControlFromHeatMappingBtnRadial.addEventListener('click', function() {
                heatmapviewRadial.style.display = "none";
                radialview.style.display = "block";
            })
        }
        if (createNewAreaBtnRadial) {
            createNewAreaBtnRadial.addEventListener('click', function() {;
                radialview.style.display = "none";
                AddressInput.style.display = "block";
                setupAutocompleteTrigger(input);
                resetDemographicTable();
                demographicTableRadial.style.display = "block";
            });
        }
        if (submit_btnRadial) {
            submit_btnRadial.addEventListener('click', function() {
                inputBtnRadial.style.display = "block";
                demographicTableRadial.style.display = "none";
                // document.getElementById("autocomplete").value = '';
            })
        }
        if (SubmitButtonAutoComplete) {
            SubmitButtonAutoComplete.addEventListener("click", function() {
                resetDemographicsTable();
                createCircleAtSelectedLocation();
                submit_btnRadial.style.display = "block";
                // setupMapClickListener();
            })
        }
        if (input_back_btn) {
            input_back_btn.addEventListener('click', function() {
                AddressInput.style.display = "none";
                radialview.style.display = "block";
                activeCircle.setMap(null);
                const demographicTableRadial = document.getElementById("demographic-table-radial");
                if (selectedCircleId && circles[selectedCircleId] && circles[selectedCircleId].cid) {
                    return;
                }
                if (!lastInteractedFeatureIds || lastInteractedFeatureIds.length === 0) {
                    demographicTableRadial.style.display = "none";
                    accumulatedData = null;
                    if (selectedCircleId) {
                        resetCircleHighlight(selectedCircleId);
                        selectedCircleId = null;
                    }
                }
            })
            }
        if (dragBtn) {
            dragBtn.addEventListener('dragstart', function(e) {
                e.target.style.opacity = '0.4';
                e.dataTransfer.setData('text/plain', e.target.id);
            });

            dragBtn.addEventListener('dragend', function(e) {
                e.target.style.opacity = '1';
            });
        }
        if (layerInformationBtnRadial) {
            layerInformationBtnRadial.addEventListener('click', function() {
                radialview.style.display = 'none';
                layerInfoViewRadial.style.display = 'block';
                renderPieChartRadial();
            });
        }
        if (backToRadialviewBtn) {
            backToRadialviewBtn.addEventListener('click', function() {
                layerInfoViewRadial.style.display = 'none';
                demographicTableRadial.style.display = "block";
                RadialViewRight.style.display = "none";
            });
        }
        if (radiusInput) {
            radiusInput.addEventListener('input', handleDynamicRadiusChange);
        }
        if (saveBtnForRadius) {
            saveBtnForRadius.addEventListener("click", async () => {
                const radiusInput = document.getElementById('typeNumber');
                const newRadiusInMiles = parseFloat(radiusInput.value);
                if (isNaN(newRadiusInMiles) || newRadiusInMiles < 1) {
                    alert("Please enter a valid radius (minimum 1 mile)");
                    return;
                }
                const newRadiusInMeters = newRadiusInMiles * 1609.34;
                await handleRadiusChange(newRadiusInMeters);
                originalRadius = null;
                hasUnsavedChanges = false;
                updateSaveButtonState();
                document.getElementById("editradialnumber").style.display = "none";
            });
        }
        if (SaveBackBtnRecruitment) {
            SaveBackBtnRecruitment.addEventListener("click", function() {
                localStorage.setItem('isRecruitmentClicked', 'true'); 
                DemographicTableRecruitment.style.display = "none";
                inputBtnRecruitment.style.display = "none";
                finishSave();
                // DemographicTableRecruitment.style.display = "none";
                // inputBtnRecruitment.style.display = "none";
            })
        }
        if (returnToMapRecruitmentFromTableRecruitment) {
            returnToMapRecruitmentFromTableRecruitment.addEventListener("click", function() {
                document.getElementById("tableViewRecruitment").style.display = "none";
                document.getElementById("map-container").style.display = "block";
            });
        }
        if (mapElement) {
            mapElement.style.display = "block";
        }
        if (recruitmentTerritoriesBtn) {
            recruitmentTerritoriesBtn.addEventListener('click', async function() {
                if (recruitmentControls) {
                    isRecruitmentClicked = !isRecruitmentClicked;
                    recruitmentControls.style.display = isRecruitmentClicked ? 'flex' : 'none';
                    if (isRecruitmentClicked) {
                        loadSavedRegions();
                    } else {
                        clearMapRegionsRecruitment();
                        labelsRecruitment.forEach(label => label.setMap(null));
                        labelsRecruitment = [];
                        regionPolygons.forEach(polygon => {
                            if (polygon) polygon.setMap(null);
                        });
                        regionPolygons = [];
                        selectedRegionsRecruitment.clear();
                        selectedRegionGroupsRecruitment.clear();
                        // if (!isAreaDevClicked) {
                            featureLayer.style = createApplyStyle(styleDefaultNormalmap);
                        // }
                    }
                }
            });
        }
        if (toggleLabelsBtnrecruitment) {
            toggleLabelsBtnrecruitment.addEventListener('click', function() {
                const isLabelsOn = toggleLabelsBtnrecruitment.textContent.includes('off');
                toggleLabelsBtnrecruitment.textContent = isLabelsOn ? 'Turn labels on' : 'Turn labels off';
                areRegionsVisibleRecruit = !isLabelsOn;
                if (areRegionsVisibleRecruit) {
                    loadSavedRegions();
                    updateLabels();
                } else {
                    labelsRecruitment.forEach(label => label.setMap(null));
                    labelsRecruitment = [];
                }
                map.data.setStyle(applyStyle);
            });
        }
        if (menuBtnrecruitment && defaultView && recruitmentView) {
            menuBtnrecruitment.addEventListener('click', function() {
                defaultView.style.display = 'none';
                recruitmentView.style.display = 'block';
            });
        }
        if (backToLayerControlBtnRecruitment && recruitmentView && defaultView) {
            backToLayerControlBtnRecruitment.addEventListener('click', function() {
                isCreatingNewArea = false;
                isEditingArea = false;
                isCreatingNewAreaRecruitment = false;
                isEditingAreaRecruit = false;
                selectedGroupForDeletionRecruitment = null;
                highlightSelectedGroupRecruitment();
                recruitmentView.style.display = 'none';
                defaultView.style.display = 'block';
                recruitmentControls.style.display = 'none';
                clearMapRegionsRecruitment();
                labelsRecruitment.forEach(label => label.setMap(null));
                labelsRecruitment = [];
                removePostalCodes();
                DemographicTable.style.display = "none";
                DemographicTableRecruitment.style.display = "none";
                DeleteLayerButtonRadial.style.display = "none";
            });
        }
        if (createNewAreaBtnRecruitment) {
            createNewAreaBtnRecruitment.addEventListener('click', function() {
                initCustomMap();
            });
        }
        if (dragBtnrecruitment) {
            dragBtnrecruitment.addEventListener('dragstart', function(e) {
                e.target.style.opacity = '0.4';
                e.dataTransfer.setData('text/plain', e.target.id);
            });

            dragBtnrecruitment.addEventListener('dragend', function(e) {
                e.target.style.opacity = '1';
            });
        }
        if (layerInformationBtnRecruitment) {
            layerInformationBtnRecruitment.addEventListener('click', function() {
                recruitmentView.style.display = 'none';
                layerInfoViewRecruitment.style.display = 'block';
                renderPieChartRecruitment();
            });
        }
        if (backToViewBtnRecruitment) {
            backToViewBtnRecruitment.addEventListener('click', function() {
                layerInfoViewRecruitment.style.display = 'none';
                recruitmentView.style.display = 'block';
            });
        }
        if (returnToMapFromTableRecruitment) {
            returnToMapFromTableRecruitment.addEventListener("click", function() {
                document.getElementById("tableViewRecruitment").style.display = "none";
                document.getElementById("map-container").style.display = "block";
            });
        }
        // const layerButtons = document.querySelector('.layer-buttons');
        if (layerButtons) {
            layerButtons.addEventListener('dragover', function(e) {
                e.preventDefault();
                const draggable = document.querySelector('.dragging');
                if (draggable) {
                    const afterElement = getDragAfterElementRecruitment(layerButtons, e.clientY);
                    if (afterElement) {
                        layerButtons.insertBefore(draggable, afterElement);
                    } else {
                        layerButtons.appendChild(draggable);
                    }
                }
            });
        }
        function getDragAfterElementRecruitment(container, y) {
            const draggableElements = [...container.querySelectorAll('.layer-btn:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    initializeColorOptions();
    initializeEventListeners();
    initializeCreateNewAreaButtons();
    document.getElementById("tableViewBtn").addEventListener("click", function() {
        document.getElementById("map-container").style.display = "none";
        document.getElementById("tableView").style.display = "block";
        populateTable();
    });
     
    document.getElementById("demographic").addEventListener("click", function() {
        document.getElementById("map-container").style.display = "none";
        document.getElementById("tableView").s5tyle.display = "block";
        populateTable();
    });
    document.getElementById("exportToCSV").addEventListener("click", exportToCSV);
    document.getElementById("DownloadDemographicbreakdown").addEventListener("click", exportToCSV);
    document.getElementById("DownloadDemographicbreakdownRadial").addEventListener("click", exportToCSVRadial);
    const layerInfoBtn = Array.from(document.querySelectorAll('.action-btn')).find(
        (el) => el.textContent.includes("Layer information")
    );
    const editLabelButtons = document.querySelectorAll('.action-btn edit-labels');
    editLabelButtons.forEach(button => {
        if (button.textContent === 'Edit label content') {
            button.addEventListener('click', () => {
                $('#editLabelModal').modal('show');
            });
        }
    });
    document.getElementById("tableViewBtnRadial").addEventListener("click", function() {
        document.getElementById("map-container").style.display = "none";
        document.getElementById("tableViewRadial").style.display = "block";
        populateTableRadial();
    });
    document.getElementById("demographicRadial").addEventListener("click", function() {
        document.getElementById("map-container").style.display = "none";
        document.getElementById("tableViewRadial").style.display = "block";
        populateTableRadial();
    });
    document.getElementById("tableViewBtnRecruitment").addEventListener("click", function() {
            document.getElementById("map-container").style.display = "none";
            document.getElementById("tableViewRecruitment").style.display = "block";
            populateTableRecruitment();
    });
    document.getElementById("demographicRecruitment").addEventListener("click", function() {
        document.getElementById("map-container").style.display = "none";
        document.getElementById("tableViewRecruitment").style.display = "block";
        populateTableRecruitment();
    });
    document.getElementById("exportToCSVRecruitment").addEventListener("click", exportToCSVRecruitment);
    document.getElementById("DownloadDemographicbreakdownRecruitment").addEventListener("click", exportToCSVRecruitment);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    initializeColorOptionsRadial();
    initializeEventListenersRadial();
    document.getElementById("DeleteLayerButtonRadial").addEventListener("click", handleDeleteRadial);
    document.querySelectorAll(".action-btn").forEach(button => {
        if (button.textContent === "Table View" || button.textContent === "Demographic report ") {
          button.addEventListener("click", function() {
            document.getElementById("map-container").style.display = "none";
            document.getElementById("tableViewRadial").style.display = "block";
            populateCircleTable();
          });
        }
    });
    document.getElementById("exportToCSVRadial").addEventListener("click", exportToCSVRadial);
    document.getElementById("DownloadDemographicbreakdown").addEventListener("click", exportToCSVRadial);
    document.getElementById("returnToMapFromTableRadial").addEventListener("click", returnToMapRadial);
    // document.getElementById('saveLabelChanges').addEventListener('click', function() {
    //     const prefixRadial = document.getElementById('prefixInput').value;
    //     $('#editLabelModal').modal('hide');
    // });
    actionBtnRadial();
    closeBtnRadial();

}
// Function to crate pie chart for area development
function renderPieChart() {
    $.ajax({
        url: "/load_regions",
        method: "GET",
        success: function(response) {
            if (response.status === 'success') {
                const savedRegions = response.regions || [];
                const classificationCounts = new Map();
                const classificationColors = new Map();
                savedRegions.forEach(region => {
                    const classification = region.classificationText || 'Unclassified';
                    const color = region.color || '#99a3a4';
                    if (classificationCounts.has(classification)) {
                        classificationCounts.set(classification, classificationCounts.get(classification) + 1);
                    } else {
                        classificationCounts.set(classification, 1);
                        classificationColors.set(classification, color);
                    }
                });
                const classifications = Array.from(classificationCounts.entries()).map(([name, count]) => ({
                    name,
                    color: classificationColors.get(name),
                    count
                }));
                const layerInfoView = document.getElementById('layerInfoViewFranchise');
                const existingCanvas = layerInfoView.querySelector('canvas');
                const existingRecords = layerInfoView.querySelector('.records-count');
                if (existingCanvas) existingCanvas.remove();
                if (existingRecords) existingRecords.remove();
                const totalRecords = classifications.reduce((sum, item) => sum + item.count, 0);
                const recordsDiv = document.createElement('div');
                recordsDiv.className = 'records-count';
                recordsDiv.textContent = `Total Records: ${totalRecords}`;
                layerInfoView.appendChild(recordsDiv);
                const chartCanvas = document.createElement('canvas');
                chartCanvas.id = 'classificationPieChart';
                layerInfoView.appendChild(chartCanvas);
                const chartLabels = classifications.map(item => item.name);
                const chartData = classifications.map(item => item.count);
                const chartColors = classifications.map(item => item.color);
                new Chart(chartCanvas, {
                    type: 'pie',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: chartData,
                            backgroundColor: chartColors
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw;
                                        const percentage = ((value / totalRecords) * 100).toFixed(1);
                                        return `${label}: ${value} records (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
                const legendDiv = document.createElement('div');
                legendDiv.className = 'classification-legend';
                legendDiv.style.marginTop = '20px';
                classifications.forEach(item => {
                    const legendItem = document.createElement('div');
                    legendItem.style.display = 'flex';
                    legendItem.style.alignItems = 'center';
                    legendItem.style.marginBottom = '8px';
                    const colorBox = document.createElement('span');
                    colorBox.style.width = '20px';
                    colorBox.style.height = '20px';
                    colorBox.style.backgroundColor = item.color;
                    colorBox.style.display = 'inline-block';
                    colorBox.style.marginRight = '8px';
                    const text = document.createElement('span');
                    const percentage = ((item.count / totalRecords) * 100).toFixed(1);
                    text.textContent = `${item.name}: ${item.count} records (${percentage}%)`;
                    legendItem.appendChild(colorBox);
                    legendItem.appendChild(text);
                    legendDiv.appendChild(legendItem);
                });
                layerInfoView.appendChild(legendDiv);
            } else {
                console.error('Error fetching saved regions:', response.message);
            }
        }
    });
}
function populateTable() {
    const tableBody = document.querySelector("#dataTable tbody");
    tableBody.innerHTML = "";
    const savedRegions = Array.from(selectedRegions.values());
    console.log(selectedRegions.values());
    const groupedRegions = {};
    savedRegions.forEach(region => {
        if (!groupedRegions[region.groupId]) {
            groupedRegions[region.groupId] = {
                id: region.groupId,
                name: region.displayName,
                color: region.color,
                classifications: new Set()
            };
        }
        groupedRegions[region.groupId].classifications.add(region.classificationText);
    });
    Object.values(groupedRegions).forEach(group => {
        const row = document.createElement("tr");
        const classifications = Array.from(group.classifications).join(", ");
        row.innerHTML = `
            <td>${group.name}</td>
            <td>${group.id}</td>
            <td>
                In Negotiation
            </td>
        `;
        tableBody.appendChild(row);
    });
}
function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Unique Key,Classification\n";
    const savedRegions = JSON.parse(localStorage.getItem('selectedRegions')) || [];
    savedRegions.forEach(region => {
      csvContent += `${region.displayName || `Feature ${region.placeId}`}," ",${region.classification || "No classification"}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const date = new Date();
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Franchise_data_${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function returnToMap() {
    document.getElementById("tableView").style.display = "none";
    document.getElementById("map-container").style.display = "block";
}
function initializeColorOptions() {
    if (isAreaDevClicked) {
        document.querySelectorAll('.color-option').forEach(option => {
            const color = option.getAttribute('data-color');
            let rgbValues;
            if (color === 'white') {
                rgbValues = '255,255,255';
            } else {
                rgbValues = color.match(/\d+,\d+,\d+/)?.[0] || '128,128,128';
            }
            option.style.setProperty('--hover-color', rgbValues);
            option.removeEventListener('click', handleColorOptionClick);
            option.addEventListener('click', handleColorOptionClick);
        });
    }
    if (isRecruitmentClicked) {
        document.querySelectorAll('.color-option').forEach(option => {
            const color = option.getAttribute('data-color');
            let rgbValues;
            if (color === 'white') {
                rgbValues = '255,255,255';
            } else {
                rgbValues = color.match(/\d+,\d+,\d+/)?.[0] || '128,128,128';
            }
            option.style.setProperty('--hover-color', rgbValues);
            option.removeEventListener('click', handleColorOptionClick);
            option.addEventListener('click', handleColorOptionClick);
        });
    }
}
function handleColorOptionClick(e) {
    const colorOption = e.target.closest('.color-option');
    if (!colorOption) return;
    document.querySelectorAll('.color-option').forEach(opt =>
        opt.classList.remove('selected')
    );
    colorOption.classList.add('selected');
    selectedColor = colorOption.dataset.color;
}
function displayVisiblePlaceIds(bounds) {
    console.log("Adding postal numbers to map")
    featureLayer.style = (params) => {
        const feature = params.feature;
        if (feature) {
            const placeId = feature.Hg;
            const service = new google.maps.places.PlacesService(map);
            service.getDetails({
                placeId: placeId,
                fields: ['address_components', 'geometry']
            }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    const postalComponent = place.address_components.find(component =>
                        component.types.includes('postal_code')
                    );
                    if (postalComponent) {
                        const postalCode = postalComponent.long_name;
                        const latLng = place.geometry.location;
                        data_list.push({ 'latLng': latLng, 'postalCode': postalCode, 'place_id': placeId });
                        createLabelOverlay(latLng, postalCode);
                    }
                }
            });
        }
        return applyStyle(params);
    };
}
function load_postal_data(data_list){
    $.ajax({
            url: "/load_postal",
            method: "POST",
            data: {
                'total_data':JSON.stringify(data_list)
            },
            success: function(response) {
                if (response.success) {
                   var retrieved_data = JSON.parse(response.retrieved_data)
                   for ( var itd=0;itd<retrieved_data.length;itd++ ){
                   var this_retrieved_data = retrieved_data[itd]
                   var latLng = this_retrieved_data[0];
                   var postal_no = this_retrieved_data[1];
                   var place_id = this_retrieved_data[2];

                try{
                   createLabelOverlay( JSON.parse(latLng),postal_no)
                   }
                catch{console.log('..')}
                  }
            }else{console.log('')}
            },
            error: function(xhr, status, error) {
                console.log("Error fetching data. Please try again.");
            }
        });
}
function createLabelOverlay(latLng, postalCode) {
    try{
    var existingOverlay = labelOverlays.find(overlay => overlay.getPosition().equals(latLng));
    if (existingOverlay) {
        return;
    }}
    catch{}
    var labelOverlay = new google.maps.OverlayView();
    labelOverlay.setMap(map);
    labelOverlay.onAdd = function() {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.background = 'transparent';
        div.style.padding = '2px';
        div.style.fontWeight = '500';
        div.style.fontSize = '12px';
        div.style.color = 'black';
        div.style.textShadow = '2px 2px 4px white, -2px -2px 4px white, 2px -2px 4px white, -2px 2px 4px white';
        div.textContent = postalCode;
        this.div_ = div;
        var panes = this.getPanes();
        panes.overlayLayer.appendChild(div);
    };
    labelOverlay.draw = function() {
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(latLng);
        var div = this.div_;
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
    };
    labelOverlay.onRemove = function() {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    };
    labelOverlay.getPosition = function() {
        return latLng;
    };
    labelOverlays.push(labelOverlay);
}
async function getDisplayName(feature, latLng) {
    if (typeof feature.fetchPlace === 'function') {
        try {
            const place = await feature.fetchPlace();
            return place.displayName || feature.name || `Feature ${feature.placeId}`;
        } catch (error) {
            console.error("Error fetching place:", error);
        }
    }
    const geocoder = new google.maps.Geocoder();
    try {
        const geocodeResult = await geocoder.geocode({ location: latLng });
        if (geocodeResult && geocodeResult.results && geocodeResult.results[0]) {
            return geocodeResult.results[0].formatted_address;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
    }
    return feature.name || `Feature ${feature.placeId}`;
}
function removePostalCodes() {
    showPostalCodes = false;
    labelOverlays.forEach(overlay => {
        if (overlay) {
            overlay.setMap(null);
        }
    });
    labelOverlays = [];
    console.log("Postal codes removed from map");
}
function handleSubmit() {
    newSelectedRegions = Array.from(selectedRegions.values()).filter(region => region.groupId === null);
    console.log("Selected regions:", newSelectedRegions.length);
    if (newSelectedRegions.length > 0) {
        document.getElementById("input-area").style.display = "block";
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.color-option[data-color="white"]')?.classList.add('selected');
        selectedColor = document.querySelector('.color-option[data-color="white"]')?.dataset.color || 'white';
    } else {
        console.log("No new regions selected. Please click on one or more regions before submitting.");
    }
}
function hide_demographic_table() {
    var table = document.getElementById('demographic-table');
        if (table.style.display === 'block') {
            table.style.display = 'none';
            var toggleButton = document.getElementById('toggle-demographic-btn');
            toggleButton.textContent = 'Show Demographic Data';
        }
}
function handleSave() {
    if (isAreaDevClicked && isRecruitmentClicked) {
        if (isEditingArea) {
            handleAreaDevSave();
        } else if (isEditingAreaRecruit) {
            handleRecruitmentSave();
        } else {
            const areaDevInput = document.getElementById('input-area');
            const recruitmentInput = document.getElementById('input-area-recruitment');
            if (areaDevInput && areaDevInput.style.display === 'block') {
                handleAreaDevSave();
            } else if (recruitmentInput && recruitmentInput.style.display === 'block') {
                handleRecruitmentSave();
            }
        }
    } else if (isAreaDevClicked) {
        handleAreaDevSave();
    } else if (isRecruitmentClicked) {
        handleRecruitmentSave();
    }
}
function handleAreaDevSave() {
    localStorage.setItem('isAreaDevClicked', 'true');
    localStorage.setItem('isRecruitmentClicked', 'false');
    
    const name = document.getElementById("area-name").value.trim();
    const franchisee = document.getElementById("franchisee").value.trim();
    const numDevelopments = parseInt(document.getElementById("num-developments").value.trim(), 10);
    const zipCodes = document.getElementById("zip-codes").value.trim().split(',').map(zip => zip.trim());
    const state = document.getElementById("state").value.trim();

    if (!name) {
        alert("Please enter a name for the selected area.");
        return;
    }

    if (!newSelectedRegions || newSelectedRegions.length === 0) {
        alert("No regions selected. Please select regions before saving.");
        return;
    }

    const groupDemographics = calculateAccumulatedDemographics();
    const displayName = prefix ? `${prefix} ${name}` : name;

    if (isEditingArea && editingGroupId !== null) {
        const existingGroup = selectedRegionGroups.get(editingGroupId);
        if (existingGroup) {
            // First, remove old regions from the selectedRegions map
            existingGroup.regions.forEach(placeId => {
                selectedRegions.delete(placeId);
            });
            const updatedGroup = {
                groupId: editingGroupId,
                name: displayName,
                color: selectedColor || 'grey',
                demographics: groupDemographics,
                classificationText: selectedClassificationText || existingGroup.classificationText,
                franchisee: franchisee,
                numDevelopments: numDevelopments,
                zipCodes: zipCodes,
                state: state,
                regions: newSelectedRegions.map(region => ({
                    displayName: displayName,
                    placeId: region.placeId,
                    featureType: region.featureType,
                    lat: region.lat,
                    lng: region.lng,
                    color: selectedColor || 'grey',
                    postalCode: region.postalCode,
                    classificationText: selectedClassificationText || existingGroup.classificationText,
                    coordinates: region.coordinates || [],
                    demographics: selectedRegionsDemographics.get(region.placeId) || {}
                }))
            };

            $.ajax({
                url: "/update_region_group",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(updatedGroup),
                success: function(response) {
                    if (response.status === 'success') {
                        // Update existing group in selectedRegionGroups
                        existingGroup.name = displayName;
                        existingGroup.color = selectedColor;
                        existingGroup.demographics = groupDemographics;
                        existingGroup.classificationText = selectedClassificationText || existingGroup.classificationText;
                        existingGroup.franchisee = franchisee;
                        existingGroup.numDevelopments = numDevelopments;
                        existingGroup.zipCodes = zipCodes;
                        existingGroup.state = state;
                        existingGroup.regions = newSelectedRegions.map(region => region.placeId);

                        newSelectedRegions.forEach(region => {
                            const updatedRegion = {
                                ...region,
                                groupId: editingGroupId,
                                displayName: displayName,
                                color: selectedColor,
                                classificationText: selectedClassificationText || existingGroup.classificationText,
                                coordinates: region.coordinates || [],
                                demographics: selectedRegionsDemographics.get(region.placeId) || {}
                            };
                            selectedRegions.set(region.placeId, updatedRegion);
                        });
                        finishSave();
                    } else {
                        console.error(response.message);
                    }
                    finishSave();
                },
                error: function(xhr, status, error) {
                    console.error("Error updating region group:", error);
                }
            });
        }
    } else {
        const newGroupId = currentGroupId++;
        selectedRegions.forEach((region, placeId) => {
            if (region.groupId === null) {
                selectedRegions.delete(placeId);
            }
        });
        const newGroupData = {
            id: newGroupId,
            name: displayName,
            color: selectedColor || 'grey',
            demographics: groupDemographics,
            classificationText: selectedClassificationText,
            franchisee: franchisee,
            numDevelopments: numDevelopments,
            zipCodes: zipCodes,
            state: state,
            regions: []
        };
        newSelectedRegions.forEach(region => {
            const updatedRegion = {
                ...region,
                groupId: newGroupId,
                displayName: displayName,
                color: selectedColor || 'grey',
                classificationText: selectedClassificationText,
                coordinates: region.coordinates || [],
                demographics: selectedRegionsDemographics.get(region.placeId) || {}
            };
            newGroupData.regions.push(region.placeId);
            selectedRegions.set(region.placeId, updatedRegion);
        });
        selectedRegionGroups.set(newGroupId, newGroupData);
        const selectedRegionsArray = Array.from(selectedRegions.values()).filter(
            region => region.groupId === newGroupId
        );
        const selectedRegionGroupsArray = [newGroupData];

        $.ajax({
            url: "/save_regions",
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                selectedRegions: selectedRegionsArray,
                selectedRegionGroups: selectedRegionGroupsArray
            }),
            success: function(response) {
                if (response.status === 'success') {
                    finishSave();
                } else {
                    console.error('Server error:', response);
                }
                finishSave();
            },
            error: function(xhr, status, error) {
                console.error("Error saving new area:", error);
            }
        });
    }
}
function handleRecruitmentSave() {
    localStorage.setItem('isAreaDevClicked', 'false');
    localStorage.setItem('isRecruitmentClicked', 'true');
    const name = document.getElementById("area-name-recruitment").value.trim();
    const recruitmentArea = document.getElementById("recruitmentArea").value.trim();
    const PotStoreCount = parseInt(document.getElementById("PotStoreCount").value.trim(), 10);
    const zipCodesRecruitment = document.getElementById("zipCodesRecruitment").value.trim().split(',').map(zip => zip.trim());
    const stateRecruitment = document.getElementById("stateRecruitment").value.trim();
    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || 'Primary Area';
    if (!name) {
        alert("Please enter a name for the selected area.");
        return;
    }
    if (!newSelectedRegionsRecruitment || newSelectedRegionsRecruitment.length === 0) {
        alert("No regions selected. Please select regions before saving.");
        return;
    }
    const groupDemographics = calculateAccumulatedDemographicsRecruitment();
    const displayName = prefixRecruitment ? `${prefixRecruitment} ${name}` : name;
    if (isEditingAreaRecruit && editingGroupIdRecruit !== null) {
        const existingGroup = selectedRegionGroupsRecruitment.get(editingGroupIdRecruit);
        if (existingGroup) {
            existingGroup.regions.forEach(placeId => {
                selectedRegionsRecruitment.delete(placeId);
            });
            const updatedGroup = {
                groupId: editingGroupIdRecruit,
                name: displayName,
                color: selectedColorRecruitment || 'grey',
                demographics: groupDemographics,
                classificationText: selectedClassificationTextRecruitment || "Recruitment Analysis",
                recruitmentArea: recruitmentArea,
                PotStoreCount: PotStoreCount,
                zipCodesRecruitment: zipCodesRecruitment,
                stateRecruitment: stateRecruitment,
                category: selectedCategory, 
                
                regions: newSelectedRegionsRecruitment.map(region => ({
                    displayName: displayName,
                    placeId: region.placeId,
                    featureType: region.featureType,
                    lat: region.lat,
                    lng: region.lng,
                    color: selectedColorRecruitment || 'grey',
                    postalCode: region.postalCode,
                    classificationText: selectedClassificationTextRecruitment || "Recruitment Analysis",
                    coordinates: region.coordinates || [],
                    demographics: selectedRegionsRecruitmentDemographics.get(region.placeId) || {}
                }))
            };
            $.ajax({
                url: "/update_region_group_recruitment",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(updatedGroup),
                success: function(response) {
                    if (response.status === 'success') {
                        existingGroup.name = displayName;
                        existingGroup.color = selectedColorRecruitment;
                        existingGroup.demographics = groupDemographics;
                        existingGroup.classificationText = selectedClassificationTextRecruitment || "Recruitment Analysis";
                        existingGroup.recruitmentArea = recruitmentArea;
                        existingGroup.PotStoreCount = PotStoreCount;
                        existingGroup.zipCodesRecruitment = zipCodesRecruitment;
                        existingGroup.stateRecruitment = stateRecruitment;
                        existingGroup.category = selectedCategory;
                        existingGroup.regions = newSelectedRegionsRecruitment.map(region => region.placeId);
                        newSelectedRegionsRecruitment.forEach(region => {
                            const updatedRegion = {
                                ...region,
                                groupId: editingGroupIdRecruit,
                                displayName: displayName,
                                color: selectedColorRecruitment,
                                classificationText: selectedClassificationTextRecruitment || "Recruitment Analysis",
                                coordinates: region.coordinates || [],
                                demographics: selectedRegionsRecruitmentDemographics.get(region.placeId) || {}
                            };
                            selectedRegionsRecruitment.set(region.placeId, updatedRegion);
                        });
                        finishSave();
                    } else {
                        console.error(response.message);
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Error updating recruitment region group:", error);
                }
            });
        }
    } else {
        const newGroupIdRecruit = currentGroupIdRecruitment++
        selectedRegionsRecruitment.forEach((region, placeId) => {
            if (region.groupId === null) {
                selectedRegionsRecruitment.delete(placeId);
            }
        });
        const newGroup = {
            id: newGroupIdRecruit,
            name: displayName,
            color: selectedColorRecruitment,
            demographics: groupDemographics,
            classificationText: selectedClassificationTextRecruitment || "Recruitment Analysis",
            recruitmentArea: recruitmentArea,
            PotStoreCount: PotStoreCount,
            zipCodesRecruitment: zipCodesRecruitment,
            stateRecruitment: stateRecruitment,
            category: selectedCategory, 
            regions: []
        };
        newSelectedRegionsRecruitment.forEach(region => {
            const updatedRegionRec = {
                ...region,
                groupId: newGroupIdRecruit,
                displayName: displayName,
                color: selectedColorRecruitment,
                classificationText: selectedClassificationTextRecruitment || "Recruitment Analysis",
                coordinates: region.coordinates || [],
                demographics: selectedRegionsRecruitmentDemographics.get(region.placeId) || {}
            };
            newGroup.regions.push(region.placeId);
            selectedRegionsRecruitment.set(region.placeId, updatedRegionRec);
        });
        selectedRegionGroupsRecruitment.set(newGroup.id, newGroup);
        const selectedRegionsArrayRec = Array.from(selectedRegionsRecruitment.values()).filter(
            region => region.groupId === newGroupIdRecruit
        );
        const selectedRegionGroupsArrayRec = [newGroup];
        $.ajax({
            url: "/save_regions_recruitment",
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ 
                selectedRegionsRecruitment: selectedRegionsArrayRec, 
                selectedRegionGroupsRecruitment: selectedRegionGroupsArrayRec 
            }),
            success: function(response) {
                
                if (response.success) {
                    finishSave();
                } else {
                    console.log('Server response:', response);
                }
                finishSave();
            },
            error: function(xhr, status, error) {
                console.log(status, "Error sending data:", error);
            }
        });
    }
}
function finishSave() {
    localStorage.setItem('loadSavedRegionsFlag', 'true'); 
    localStorage.setItem('leftPanelActive', $('#leftPanel').hasClass('active') ? 'true' : 'false');  
    resetUI();
    resetUIrecruitment();
    location.reload();
}
function resetUI() {
    document.getElementById("input-area").style.display = "none";
    document.getElementById("area-name").value = "";
    selectedColor = 'grey';
    isEditingArea = false;
    editingGroupId = null;
    originalRegions = [];
    if (newSelectedRegions.length === 0) {
        selectedRegionsDemographics.clear();
        resetDemographicsTable();
        document.getElementById('demographic-table').style.display = 'none';
    }
}
function resetUIrecruitment() {
    document.getElementById("input-area-recruitment").style.display = "none";
    document.getElementById("area-name-recruitment").value = "";
    selectedColorRecruitment = 'grey';
    isEditingAreaRecruit = false;
    editingGroupIdRecruit = null;
    originalRegionsRecruit = [];
    if (newSelectedRegionsRecruitment.length === 0) {
        selectedRegionsRecruitmentDemographics.clear();
        resetDemographicsTableRecruitment();
        document.getElementById('demographic-table-recruitment').style.display = 'none';
    }  
}
function resetDemographicsTable() {
    const table = document.getElementById('demographicTable');
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');
    for (let row of rows) {
        const valueCell = row.cells[1];
        valueCell.textContent = '0';
    }
}
function initializePostalCodeOverlay() {
    if (google && google.maps && google.maps.OverlayView) {
        class PostalCodeOverlay extends google.maps.OverlayView {
            constructor(position, postalCode, map) {
                super();
                this.position = position;
                this.postalCode = postalCode;
                this.div = null;
                this.setMap(map);
            }
            onAdd() {
                this.div = document.createElement('div');
                this.div.style.position = 'absolute';
                this.div.style.backgroundColor = 'transparent';
                this.div.style.padding = '5px';
                this.div.style.fontWeight = '900';
                this.div.style.fontSize = '12px';
                this.div.style.color = 'black';
                this.div.style.textShadow = '2px 2px 4px white, -2px -2px 4px white, 2px -2px 4px white, -2px 2px 4px white';
                this.div.innerHTML = this.postalCode;
                const panes = this.getPanes();
                panes.overlayLayer.appendChild(this.div);
            }
            draw() {
                const overlayProjection = this.getProjection();
                const position = overlayProjection.fromLatLngToDivPixel(this.position);
                this.div.style.left = position.x + 'px';
                this.div.style.top = position.y + 'px';
            }
            onRemove() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            }
        }
        window.PostalCodeOverlay = PostalCodeOverlay;  // Expose class globally if needed
    } else {
        console.error('Google Maps API not loaded yet.');
    }
}
function addNewRegion(feature, latLng) {
    resetDemographicsTable();
    const placeId = feature.placeId;
    getDisplayName(feature, latLng).then(displayName => {
        const postalCode = displayName.match(/\d{5}/)?.[0] || "00000";
        updateZipCodeInput(postalCode, 'add');
        add_state(postalCode) 
        $.ajax({
            url: "/get_data",
            method: "GET",
            data: {
                "zip_code": postalCode
            },
            success: function(response) {
                if (response.success) {
                    selectedRegionsDemographics.set(placeId, response.data);
                    updateAccumulatedDemographics();
                    document.getElementById('demographic-table').style.display = 'block';
                    document.getElementById('demographic-table-recruitment').style.display = 'none';
                    document.getElementById('demographic-table-radial').style.display = 'none';
                } else {
                    console.log("Could not find data for ZIP code: " + postalCode);
                }
            },
            error: function(xhr, status, error) {
                console.log("Error fetching data. Please try again.");
            }
        });
        selectedRegions.set(placeId, {
            displayName: displayName,
            placeId: placeId,
            featureType: feature.featureType,
            lat: latLng.lat(),
            lng: latLng.lng(),
            groupId: null,
            color: null,
            postalCode: postalCode
        });
        featureLayer.style = applyStyle;
        updateLabels();
    });
}
async function addNewRegionForEdit(feature, latLng) {
    const placeId = feature.placeId;
    const displayName = await getDisplayName(feature, latLng);
    const postalCode = displayName.match(/\d{5}/)?.[0] || "00000";
    updateZipCodeInput(postalCode, 'add');
    add_state(postalCode);
    $.ajax({
        url: "/get_data",
        method: "GET",
        data: {
            "zip_code": postalCode
        },
        success: function(response) {
            if (response.success) {
                selectedRegionsDemographics.set(placeId, response.data);
                updateAccumulatedDemographics();
                document.getElementById('demographic-table').style.display = 'block';
                document.getElementById('demographic-table-recruitment').style.display = 'none';
                document.getElementById('demographic-table-radial').style.display = 'none';
                const newRegion = {
                    displayName: displayName,
                    placeId: placeId,
                    featureType: feature.featureType,
                    lat: latLng.lat(),
                    lng: latLng.lng(),
                    groupId: editingGroupId,
                    color: selectedColor,
                    postalCode: postalCode
                };
                selectedRegions.set(placeId, newRegion);
                newSelectedRegions.push(newRegion);
                featureLayer.style = applyStyle;
                updateLabels();
                map.data.setStyle({visible: true});
            } else {
                console.log("Could not find data for ZIP code: " + postalCode);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error fetching data. Please try again.");
        }
    });
}
function cancelSelection() {
    const placeIdsToRemove = [];
    selectedRegions.forEach((region, placeId) => {
        if (region.groupId === null) {
            placeIdsToRemove.push(placeId);
        }
    });
    placeIdsToRemove.forEach(placeId => {
        selectedRegions.delete(placeId);
        selectedRegionsDemographics.delete(placeId);
    });
    document.getElementById('zip-codes').value = '';
    if (selectedRegionsDemographics.size > 0) {
        updateAccumulatedDemographics();
        document.getElementById('demographic-table').style.display = 'block';
        document.getElementById('demographic-table-recruitment').style.display = 'none';
        document.getElementById('demographic-table-radial').style.display = 'none';
    } else {
        resetDemographicsTable();
        document.getElementById('demographic-table').style.display = 'none';
    }
    if (isEditingArea) {
        newSelectedRegions = [];
    }
    featureLayer.style = createNewAreaStyle;
    updateLabels();
    isCreatingNewArea = true;
    console.log("Selection cancelled");
}
function handleAreaDevClick(e) {
    const clickedFeature = e.features[0];
    if (!clickedFeature) return;
    const placeId = clickedFeature.placeId;
    lastInteractedFeatureIds = [clickedFeature.placeId];
    if (!placeId) return;
    if (isCreatingNewArea) {
        handleCreateNewAreaClick(clickedFeature, placeId, e.latLng);
        return;
    }
    if (isEditingArea) {
        const existingRegionIndex = newSelectedRegions.findIndex(r => r.placeId === placeId);
        if (existingRegionIndex > -1) {
            const postalCode = newSelectedRegions[existingRegionIndex].postalCode;
            const zipCodeInput = document.getElementById('zip-codes');
            let currentZips = zipCodeInput.value.split(',').map(zip => zip.trim()).filter(zip => zip);
            currentZips = currentZips.filter(zip => zip !== postalCode);
            zipCodeInput.value = currentZips.join(', ');
            newSelectedRegions.splice(existingRegionIndex, 1);
            selectedRegionsDemographics.delete(placeId);
            selectedRegions.delete(placeId);
            if (newSelectedRegions.length === 1) {
                alert("Atleast one region is required for editing.")
            }
            if (selectedRegionsDemographics.size > 0) {
                updateAccumulatedDemographics();
                document.getElementById('demographic-table').style.display = 'block';
                // document.getElementById('submit-btn').style.display = 'none';
                document.getElementById('demographic-table-recruitment').style.display = 'none';
                document.getElementById('demographic-table-radial').style.display = 'none';
            } else {
                resetDemographicsTable();
                document.getElementById('demographic-table').style.display = 'none';
            }
            featureLayer.style = (feature) => applyStyle(feature);
            updateLabels();
            map.data.setStyle({visible: true});
        } else {
            addNewRegionForEdit(clickedFeature, e.latLng);
        }
    } else {
        const clickedRegion = selectedRegions.get(placeId);
        if (clickedRegion) {
            if (clickedRegion.groupId === null) {
                selectedRegions.delete(placeId);
                selectedRegionsDemographics.delete(placeId);
                if (selectedRegionsDemographics.size > 0) {
                    updateAccumulatedDemographics();
                    document.getElementById('demographic-table').style.display = 'block';
                    // document.getElementById('submit-btn').style.display = 'none';
                    document.getElementById('demographic-table-recruitment').style.display = 'none';
                    document.getElementById('demographic-table-radial').style.display = 'none';
                } else {
                    resetDemographicsTable();
                    document.getElementById('demographic-table').style.display = 'none';
                }
            } else {
                const groupIdarea = clickedRegion.groupId;
                const grouparea = selectedRegionGroups.get(groupIdarea);
                if (grouparea) {
                    if (selectedGroupForDeletion === groupIdarea) {
                        selectedGroupForDeletion = null;
                        document.getElementById('demographic-table').style.display = 'none';
                    } else {
                        selectedGroupForDeletion = groupIdarea;
                        document.getElementById('saveNotesBtn').addEventListener('click', function () {
                        saveNotes(groupIdarea);
                        });
                        displayGroupDemographics(grouparea.demographics);
                        document.getElementById('demographic-table').style.display = 'block';
                        document.getElementById('submit-btn').style.display = 'none';
                        document.getElementById('demographic-table-recruitment').style.display = 'none';
                        document.getElementById('demographic-table-radial').style.display = 'none';
                        document.getElementById('ActionBtn').style.display = "block";
                        document.getElementById('CloseBtn').style.display = "block";
                        actionBtn();
                        closeBtn();
                        GoBackToTableFranchise();
                    }
                    highlightSelectedGroup();
                    updateRegionAppearance(groupIdarea);
                }
            }
        } else {
            addNewRegion(clickedFeature, e.latLng);
        }
    }
    lastInteractedFeatureIds = [];
    featureLayer.style = applyStyle;
    updateLabels();
}
function handleRecruitmentClick(e) {
    const clickedFeatureRecruit = e.features[0];
    if (!clickedFeatureRecruit) return;
    const placeId = clickedFeatureRecruit.placeId;
    if (!placeId) return;
    if (isCreatingNewArea) {
        handleCreateNewAreaRecruitmentClick(clickedFeatureRecruit, placeId, e.latLng);
        return;
    }
    if (isEditingAreaRecruit) {
        const existingRegionIndexRec = newSelectedRegionsRecruitment.findIndex(r => r.placeId === placeId);
        if (existingRegionIndexRec > -1) {
            const postalCode = newSelectedRegionsRecruitment[existingRegionIndexRec].postalCode;
            const zipCodeInputRec = document.getElementById('zipCodesRecruitment');
            let currentZipsRec = zipCodeInputRec.value.split(',').map(zip => zip.trim()).filter(zip => zip);
            currentZipsRec = currentZipsRec.filter(zip => zip !== postalCode);
            zipCodeInputRec.value = currentZipsRec.join(', ');
            newSelectedRegionsRecruitment.splice(existingRegionIndexRec, 1);
            selectedRegionsRecruitmentDemographics.delete(placeId);
            selectedRegionsRecruitment.delete(placeId);
            if (newSelectedRegionsRecruitment.length === 1) {
                alert("At least one region is required for editing.");
            }
            if (selectedRegionsRecruitmentDemographics.size > 0) {
                updateAccumulatedDemographicsRecruitment();
                document.getElementById('demographic-table-recruitment').style.display = 'block';
                document.getElementById('demographic-table').style.display = 'none';
                document.getElementById('demographic-table-radial').style.display = 'none';
            } else {
                resetDemographicsTableRecruitment();
                document.getElementById('demographic-table-recruitment').style.display = 'none';
            }
            featureLayer.style = (feature) => applyStyle(feature);
            updateLabels();
            map.data.setStyle({visible: true});
        } else {
            addNewRegionForEditRecruitment(clickedFeatureRecruit, e.latLng);
        }
    } else {
        const clickedRegionRecruit = selectedRegionsRecruitment.get(placeId);
        if (clickedRegionRecruit) {
            if (clickedRegionRecruit.groupId === null) {
                selectedRegionsRecruitment.delete(placeId);
                selectedRegionsRecruitmentDemographics.delete(placeId);

                if (selectedRegionsRecruitmentDemographics.size > 0) {
                    updateAccumulatedDemographicsRecruitment();
                    document.getElementById('demographic-table-recruitment').style.display = 'block';
                    document.getElementById('demographic-table').style.display = 'none';
                        document.getElementById('demographic-table-radial').style.display = 'none';
                } else {
                    resetDemographicsTableRecruitment();
                    document.getElementById('demographic-table-recruitment').style.display = 'none';
                }
            } else {
                const groupIdRecruit = clickedRegionRecruit.groupId;
                const groupRec = selectedRegionGroupsRecruitment.get(groupIdRecruit);

                if (groupRec) {
                    if (selectedGroupForDeletionRecruitment === groupIdRecruit) {
                        selectedGroupForDeletionRecruitment = null;
                        document.getElementById('demographic-table-recruitment').style.display = 'none';
                    } else {
                        selectedGroupForDeletionRecruitment = groupIdRecruit;
                         document.getElementById('saveNotesBtn').addEventListener('click', function () {
                        saveNotesRecruit(groupIdRecruit);
                        });
                        displayGroupDemographicsRecruitment(groupRec.demographicsRec);
                        document.getElementById('demographic-table-recruitment').style.display = 'block';
                        document.getElementById('demographic-table').style.display = 'none';
                        document.getElementById('demographic-table-radial').style.display = 'none';
                        document.getElementById('ActionBtnRecruitment').style.display = "block";
                        document.getElementById('CloseBtnRecruitment').style.display = "block";
                        document.getElementById('submit-btn-recruitment').style.display = "none";
                        actionBtnRecruitment();
                        closeBtnRecruitment();
                        GoBackToTableRecruitment();
                    }
                    highlightSelectedGroupRecruitment(groupIdRecruit);
                    updateRegionAppearanceRecruitment(groupIdRecruit);
                }
            }
        } else {
            addNewRegionRecruitment(clickedFeatureRecruit, e.latLng);
        }
    }
    lastInteractedFeatureIds = [];
    featureLayer.style = applyStyle;
    updateLabels();
}
function handleBothClicks(e) {
    const clickedFeatureBoth = e.features[0];
    if (!clickedFeatureBoth) return;
    const placeIdBoth = clickedFeatureBoth.placeId;
    if (!placeIdBoth) return;
    if (isEditingArea) {
        handleAreaDevClick(e);
        return;
    }
    if (isEditingAreaRecruit) {
        handleRecruitmentClick(e);
        return;
    }
    if (selectedGroupForDeletion !== null || selectedGroupForDeletionRecruitment !== null) {
        // Reset Area Development selection if it exists
        if (selectedGroupForDeletion) {
            resetGroupHighlight(selectedGroupForDeletion);
            selectedGroupForDeletion = null;
            document.getElementById('demographic-table').style.display = 'none';
            document.getElementById('ActionBtn').style.display = "none";
            document.getElementById('CloseBtn').style.display = "none";
        }
        // Reset Recruitment selection if it exists
        if (selectedGroupForDeletionRecruitment) {
            resetGroupHighlight(selectedGroupForDeletionRecruitment);
            selectedGroupForDeletionRecruitment = null;
            document.getElementById('demographic-table-recruitment').style.display = 'none';
            document.getElementById('ActionBtnRecruitment').style.display = "none";
            document.getElementById('CloseBtnRecruitment').style.display = "none";
        }
    }
    const regionsEntries = Array.from(selectedRegions);
    const recruitmentEntries = Array.from(selectedRegionsRecruitment);
    const isRecruitmentRegion = (targetPlaceId) => {
        for (const [key, value] of recruitmentEntries) {
            if (key === targetPlaceId && value.groupId !== null) {
                return true;
            }
        }
        return false;
    };
    const isAreaDevRegion = (targetPlaceId) => {
        for (const [key, value] of regionsEntries) {
            if (key === targetPlaceId && value.groupId !== null) {
                return true;
            }
        }
        return false;
    };
    if (isRecruitmentRegion(placeIdBoth)) {
        handleRecruitmentClick(e);
    } else if (isAreaDevRegion(placeIdBoth)) {
        handleAreaDevClick(e);
    } else {
        const userChoice = document.getElementById('franchiseView').style.display !== 'none';
        if (userChoice) {
            handleAreaDevClick(e);
        } else {
            handleRecruitmentClick(e);
        }
    }
    lastInteractedFeatureIds = [];
    featureLayer.style = applyStyle;
    updateLabels();
}
function handleClick(e) {
    if (isAreaDevClicked && isRecruitmentClicked) {
        handleBothClicks(e);
    } else if (isAreaDevClicked) {
        handleAreaDevClick(e);
    } else if (isRecruitmentClicked) {
        handleRecruitmentClick(e);
    }
}
function handleCreateNewAreaClick(clickedFeature, placeId, latLng) {
    const existingRegion = selectedRegions.get(placeId);
    if (existingRegion && existingRegion.groupId === null) {
        const postalCode = existingRegion.postalCode;
        updateZipCodeInput(postalCode, 'remove');
        selectedRegions.delete(placeId);
        selectedRegionsDemographics.delete(placeId);
        if (selectedRegionsDemographics.size > 0) {
            updateAccumulatedDemographics();
            document.getElementById('demographic-table').style.display = 'block';
        } else {
            resetDemographicsTable();
            document.getElementById('demographic-table').style.display = 'none';
        }
    } else if (!existingRegion) {
        addNewRegion(clickedFeature, latLng);
        updateAccumulatedDemographics();
        document.getElementById('demographic-table').style.display = 'block';
    }
    lastInteractedFeatureIds = [];
    featureLayer.style = createNewAreaStyle;
}
function updateZipCodeInput(postalCode, action) {
    const zipCodeInput = document.getElementById('zip-codes');
    let zipCodes = zipCodeInput.value ? zipCodeInput.value.split(',').map(zip => zip.trim()).filter(zip => zip) : [];
    if (action === 'add' && !zipCodes.includes(postalCode)) {
        zipCodes.push(postalCode);
    } else if (action === 'remove') {
        zipCodes = zipCodes.filter(zip => zip !== postalCode);
    }
    zipCodeInput.value = zipCodes.join(', ');
}
function updateZipCodeInputRecruitment(postalCode, action) {
    const zipCodeInput = document.getElementById('zipCodesRecruitment');
    let zipCodes = zipCodeInput.value ? zipCodeInput.value.split(',').map(zip => zip.trim()).filter(zip => zip) : [];
    if (action === 'add' && !zipCodes.includes(postalCode)) {
        zipCodes.push(postalCode);
    } else if (action === 'remove') {
        zipCodes = zipCodes.filter(zip => zip !== postalCode);
    }
    zipCodeInput.value = zipCodes.join(', ');
}
function updateStateInput(stateName) {
    const stateInput = document.getElementById('state');
    let states = stateInput.value.split(',').map(state => state.trim()).filter(state => state);
    if (!states.includes(stateName)) {
        states.push(stateName);
    }
    stateInput.value = states.join(', ');
}
function updateStateInputRec(stateName) {
    const stateInput = document.getElementById('stateRecruitment');
    let states = stateInput.value.split(',').map(state => state.trim()).filter(state => state);
    
    if (!states.includes(stateName)) {
        states.push(stateName);
    }
    stateInput.value = states.join(', ');
}
function updateStateInputRadial(stateName, cityName) {
    const stateInput = document.getElementById('state-radial');
    const cityInput = document.getElementById('city-radial');
    const addressRadial = document.getElementById('address-radial');
    const inputAddress = document.getElementById('autocomplete');

    let states = stateInput.value.split(',').map(state => state.trim()).filter(state => state);
    let cities = cityInput.value.split(',').map(city => city.trim()).filter(city => city);

    if (!states.includes(stateName)) {
        states.push(stateName);
    }
    stateInput.value = states.join(', ');

    if (!cities.includes(cityName)) {
        cities.push(cityName);
    }
    cityInput.value = cities.join(', ');
    const addressValue = inputAddress.value.trim();
    if (addressValue) {
        addressRadial.value = addressValue;
    }
}

function add_state(postalCode){
    $.ajax({
        url: "/get_state",
        method: "GET",
        data: {
            "zip_code": postalCode
        },
        success: function(response) {
            if (response.success) {
                const stateName = response.data;
                updateStateInput(stateName);
            } else {
                console.log("Could not find state data for ZIP code: " + postalCode);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error fetching state data. Please try again.");
        }
    });    
}
function add_state_rec(postalCode){
    $.ajax({
        url: "/get_state",
        method: "GET",
        data: {
            "zip_code": postalCode
        },
        success: function(response) {
            if (response.success) {
                const stateName = response.data;
                updateStateInputRec(stateName);
            } else {
                console.log("Could not find state data for ZIP code: " + postalCode);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error fetching state data. Please try again.");
        }
    });    
}
function add_state_raial(postalCode){
    $.ajax({
        url: "/get_state",
        method: "GET",
        data: {
            "zip_code": postalCode
        },
        success: function(response) {
            if (response.success) {
                const stateName = response.data;
                const cityName = response.city;
                updateStateInputRadial(stateName,cityName);
            } else {
                console.log("Could not find state data for ZIP code: " + postalCode);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error fetching state data. Please try again.");
        }
    });    
}
function handleCreateNewAreaRecruitmentClick(clickedFeature, placeId, latLng) {
    const existingRegionRecruit = selectedRegionsRecruitment.get(placeId);
    if (existingRegionRecruit && existingRegionRecruit.groupId === null) {
        const postalCode = existingRegionRecruit.postalCode;
        updateZipCodeInputRecruitment(postalCode, 'remove');
        selectedRegionsRecruitment.delete(placeId);
        selectedRegionsRecruitmentDemographics.delete(placeId);
        
        if (selectedRegionsRecruitmentDemographics.size > 0) {
            updateAccumulatedDemographicsRecruitment();
            document.getElementById('demographic-table-recruitment').style.display = 'block';
        } else {
            resetDemographicsTableRecruitment();
            document.getElementById('demographic-table-recruitment').style.display = 'none';
        }
    } else if (!existingRegionRecruit) {
        addNewRegionRecruitment(clickedFeature, latLng);
        updateAccumulatedDemographicsRecruitment();
        document.getElementById('demographic-table-recruitment').style.display = 'block';
    }
    lastInteractedFeatureIds = [];
    featureLayer.style = createNewAreaStyle;
}
function cancelRecruitmentSelection() {
    // Clear only unsaved/newly selected recruitment regions
    // These are regions with groupId === null
    
    // Create an array of placeIds to remove
    const placeIdsToRemove = [];
    selectedRegionsRecruitment.forEach((region, placeId) => {
        if (region.groupId === null) {
            placeIdsToRemove.push(placeId);
        }
    });
    
    // Remove each region
    placeIdsToRemove.forEach(placeId => {
        selectedRegionsRecruitment.delete(placeId);
        selectedRegionsRecruitmentDemographics.delete(placeId);
    });
    
    // Check if the zip codes input for recruitment exists before trying to clear it
    const zipCodesRecruitment = document.getElementById('zipCodesRecruitment');
    if (zipCodesRecruitment) {
        zipCodesRecruitment.value = '';
    }
    
    // Reset demographics if needed
    if (selectedRegionsRecruitmentDemographics.size > 0) {
        updateAccumulatedDemographicsRecruitment();
        document.getElementById('demographic-table-recruitment').style.display = 'block';
    } else {
        resetDemographicsTableRecruitment();
        document.getElementById('demographic-table-recruitment').style.display = 'none';
    }
    
    // Update the map styling
    featureLayer.style = createNewAreaStyle;
    updateLabels();
    
    // Reset any creation mode flags if needed
    isCreatingNewAreaRecruitment = true;
    
    console.log("Recruitment selection cancelled");
}
function updateRegionAppearance(groupId) {
    const group = selectedRegionGroups.get(groupId);
    if (group && group.regions) {
        group.regions.forEach(placeId => {
            const region = selectedRegions.get(placeId);
            if (region) {
                // Update only the selected regions' appearance
                featureLayer.style = createApplyStyle({
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: region.color || 'grey',
                    fillOpacity: selectedGroupForDeletion === groupId ? 0.2 : 0.5
                });
            }
        });
    }
}
function updateRegionAppearanceRecruitment(groupId) {
    const group = selectedRegionGroupsRecruitment.get(groupId);
    if (group && group.regions) {
        group.regions.forEach(placeId => {
            const region = selectedRegionsRecruitment.get(placeId);
            if (region) {
                // Update only the selected regions' appearance
                featureLayer.style = createApplyStyle({
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: region.color || 'grey',
                    fillOpacity: selectedGroupForDeletionRecruitment === groupId ? 0.2 : 0.5
                });
            }
        });
    }
}

function calculateAccumulatedDemographics() {
    const accumulatedData = {
        population: 0,
        total_households: 0,
        income_less_than_10k : 0,
        income_10k_15k: 0,
        income_15k_25k: 0,
        income_25k_35k: 0,
        income_35k_50k: 0,
        income_50k_75k: 0,
        income_75k_100k: 0,
        income_100k_150k: 0,
        income_150k_200k: 0,
        income_200k_plus: 0
    };
    selectedRegionsDemographics.forEach(data => {
        accumulatedData.population = (parseFloat(accumulatedData.population) + parseFloat(data.population || 0)).toFixed(2);
        accumulatedData.total_households = (parseFloat(accumulatedData.total_households) + parseFloat(data.total_households || 0)).toFixed(2);
        accumulatedData.income_less_than_10k = (parseFloat(accumulatedData.income_less_than_10k) + parseFloat(data.income_less_than_10k || 0)).toFixed(2);
        accumulatedData.income_10k_15k = (parseFloat(accumulatedData.income_10k_15k) + parseFloat(data.income_10k_15k || 0)).toFixed(2);
        accumulatedData.income_15k_25k = (parseFloat(accumulatedData.income_15k_25k) + parseFloat(data.income_15k_25k || 0)).toFixed(2);
        accumulatedData.income_25k_35k = (parseFloat(accumulatedData.income_25k_35k) + parseFloat(data.income_25k_35k || 0)).toFixed(2);
        accumulatedData.income_35k_50k = (parseFloat(accumulatedData.income_35k_50k) + parseFloat(data.income_35k_50k || 0)).toFixed(2);
        accumulatedData.income_50k_75k = (parseFloat(accumulatedData.income_50k_75k) + parseFloat(data.income_50k_75k || 0)).toFixed(2);
        accumulatedData.income_75k_100k = (parseFloat(accumulatedData.income_75k_100k) + parseFloat(data.income_75k_100k || 0)).toFixed(2);
        accumulatedData.income_100k_150k = (parseFloat(accumulatedData.income_100k_150k) + parseFloat(data.income_100k_150k || 0)).toFixed(2);
        accumulatedData.income_150k_200k = (parseFloat(accumulatedData.income_150k_200k) + parseFloat(data.income_150k_200k || 0)).toFixed(2);
        accumulatedData.income_200k_plus = (parseFloat(accumulatedData.income_200k_plus) + parseFloat(data.income_200k_plus || 0)).toFixed(2);
    });
    Object.keys(accumulatedData).forEach(key => {
        accumulatedData[key] = parseFloat(accumulatedData[key]);
    });
    return accumulatedData;
}
function updateAccumulatedDemographics() {
    const accumulatedData = calculateAccumulatedDemographics();
    const table = document.getElementById('demographicTable');
    const tbodies = table.getElementsByTagName('tbody');
    const rows = [];

    for (let tbody of tbodies) {
        for (let row of tbody.getElementsByTagName('tr')) {
            rows.push(row);
        }
    }

    const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    for (let row of rows) {
        const label = row.cells[0].textContent.trim();
        const valueCell = row.cells[1];
        switch(label) {
            case 'Population':
                valueCell.textContent = formatNumber(accumulatedData.population);
                break;
            case 'Households':
                valueCell.textContent = formatNumber(accumulatedData.total_households);
                break;
            case 'Households Less Than $10,000 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_less_than_10k);
                break;
            case 'Household Income - $10,000 to $14,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_10k_15k);
                break;
            case 'Household Income - $15,000 to $24,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_15k_25k);
                break;
            case 'Household Income - $25,000 to $34,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_25k_35k);
                break;
            case 'Household Income - $35,000 to $49,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_35k_50k);
                break;
            case 'Household Income - $50,000 to $74,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_50k_75k);
                break;
            case 'Household Income - $75,000 to $99,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_75k_100k);
                break;
            case 'Household Income - $100,000 to $149,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_100k_150k);
                break;
            case 'Household Income - $150,000 to $199,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_150k_200k);
                break;
            case 'Household Income - $200,000 and over (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_200k_plus);
                break;
            default:
                valueCell.textContent = '0';
        }
    }
}
function highlightSelectedGroup() {
    featureLayer.style = applyStyle;
    updateLabels();
}
function handleDelete() {
    if (document.getElementById("confirmDeleteButton")) {
    document.getElementById("confirmDeleteButton").addEventListener("click", () => {
        if (selectedGroupForDeletion !== null) {
            const groupToDelete = selectedRegionGroups.get(selectedGroupForDeletion);
            if (groupToDelete) {
                $.ajax({
                    url: "/delete_region_group",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ groupId: selectedGroupForDeletion}),
                    success: function(response) {
                        if (response.status === 'success') {
                            groupToDelete.regions.forEach(placeId => {
                                selectedRegions.delete(placeId);
                            });
                            selectedRegionGroups.delete(selectedGroupForDeletion);
                            selectedGroupForDeletion = null;
                            resetDemographicsTable();
                            featureLayer.style = applyStyle;
                            updateLabels();
                            document.getElementById("demographic-table").style.display = "none";
                            document.getElementById("franchiseViewRight").style.display = "none";
                        } else {
                            console.error(response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error("Error deleting region group:", error);
                    }
                });
            }
        } else {
            console.log("No group selected for deletion.");
        }
        $('#delet-area').modal('hide');
    });
}
}
function initializeEventListeners() {
    // setupMapClickListener();
    if (isAreaDevClicked) {
        document.getElementById("DeleteLayerButton").addEventListener("click", () => {
            console.log("selectedGroupForDeletion", selectedGroupForDeletion);
            if (selectedGroupForDeletion !== null) {
                $('#delet-area').modal('show');
                handleDelete();
            } else {
                console.log("No group selected for deletion. Please click on a named region before deleting.");
            }
        });
        document.getElementById("save-btn")?.addEventListener("click", handleSave);
        document.getElementById("cancel-btn").addEventListener("click", cancelSelection);
        document.querySelectorAll('.action-btn').forEach(button => {
            if (button.textContent.trim() === 'Edit label content') {
                button.addEventListener('click', () => {
                    $('#editLabelModal').modal('show');
                });
            }
        });

        document.querySelectorAll('.color-option').forEach(option => {
            const color = option.getAttribute('data-color');
            let rgbValues;
            if (color === 'white') {
                rgbValues = '255,255,255';
            } else {
                rgbValues = color.match(/\d+,\d+,\d+/)?.[0] || '128,128,128';
            }
            option.style.setProperty('--hover-color', rgbValues);
            option.addEventListener('click', function(e) {
                document.querySelectorAll('.color-option').forEach(opt =>
                    opt.classList.remove('selected')
                );
                this.classList.add('selected');
                selectedColor = this.dataset.color;
            });
        });
    }
    if (isRecruitmentClicked) {
        document.getElementById("DeleteLayerButtonRecruitment").addEventListener("click", () => {
            console.log("selectedGroupForDeletion Recruitment", selectedGroupForDeletionRecruitment);
            if (selectedGroupForDeletionRecruitment !== null) {
                $('#delet-area').modal('show');
            } else {
                console.log("No group selected for deletion. Please click on a named region before deleting.");
            }
        });
        document.getElementById("cancel-btn-rec").addEventListener("click", cancelRecruitmentSelection);
        document.getElementById("save-btn-recruitment")?.addEventListener("click", handleSave);
        document.querySelectorAll('.action-btn').forEach(button => {
            if (button.textContent.trim() === 'Edit label content') {
                button.addEventListener('click', () => {
                    $('#editLabelModal').modal('show');
                });
            }
        });
        document.querySelectorAll('.color-option').forEach(option => {
            const color = option.getAttribute('data-color');
            let rgbValues;
            if (color === 'white') {
                rgbValues = '255,255,255';
            } else {
                rgbValues = color.match(/\d+,\d+,\d+/)[0];
            }
            option.style.setProperty('--hover-color', rgbValues);
            
            option.addEventListener('click', (e) => {
                const colorOption = e.target.closest('.color-option');
                if (!colorOption) return;
                
                document.querySelectorAll('.color-option').forEach(opt =>
                    opt.classList.remove('selected')
                );
                colorOption.classList.add('selected');
                const categoryText = document.querySelector('input[name="category"]:checked')?.value
                // Get the category text
                const selectedClassificationTextRecruitmentValue = colorOption.querySelector('p').textContent;
                if (categoryText === "Primary Area") {
                    selectedColorRecruitment = "rgb(255, 255, 153)";
                } else if (categoryText === "Secondary Area") {
                    selectedColorRecruitment = "rgb(230, 230, 0)";
                } else {
                    selectedColorRecruitment = colorOption.dataset.color;
                }
                
                selectedClassificationTextRecruitment = selectedClassificationTextRecruitmentValue;
            });
        });
    }
}
function handleEditArea() {
    const loader = document.getElementById("loader-wrapper");
    const franchiseViewRight = document.getElementById("franchiseViewRight");
    const demographicTable = document.getElementById('demographic-table');
    const inputArea = document.getElementById("input-area");
    const areaName = document.getElementById("area-name");
    const franchisee = document.getElementById("franchisee");
    const NumberOfDev = document.getElementById("num-developments");
    const zipCodeInput = document.getElementById("zip-codes");
    const stateInput = document.getElementById("state");

    zipCodeInput.value = "";
    stateInput.value = "";
    franchisee.value = "";
    NumberOfDev.value = "";

    loader.style.display = "block";
    franchiseViewRight.style.display = "none";
    demographicTable.style.display = 'none';

    if (selectedGroupForDeletion === null) {
        loader.style.display = "none";
        alert("Please select an area to edit first");
        return;
    }

    isEditingArea = true;
    isEditingAreaRecruit = false;
    editingGroupId = selectedGroupForDeletion;

    const groupToEdit = selectedRegionGroups.get(editingGroupId);
    newSelectedRegions = [];
    selectedRegionsDemographics.clear();

    if (!groupToEdit || !groupToEdit.regions) {
        loader.style.display = "none";
        return;
    }

    selectedColor = groupToEdit.color || 'grey';
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.color === selectedColor);
    });

    featureLayer.style = applyStyle;

    const uniqueStates = new Set();
    const processedZipCodes = new Set();

    const fetchPromises = groupToEdit.regions.map(placeId => {
        const region = selectedRegions.get(placeId);
        if (!region) return Promise.resolve();

        const zip = region.postalCode;
        const clonedRegion = JSON.parse(JSON.stringify(region));
        newSelectedRegions.push(clonedRegion);
        updateZipCodeInput(zip, 'add');

        if (processedZipCodes.has(zip)) {
            return Promise.resolve();
        }
        processedZipCodes.add(zip);

        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/get_state",
                method: "GET",
                data: { "zip_code": zip },
                success: function(stateResponse) {
                    if (stateResponse.success) {
                        uniqueStates.add(stateResponse.data);
                        stateInput.value = Array.from(uniqueStates).join(', ');
                    }

                    $.ajax({
                        url: "/get_data",
                        method: "GET",
                        data: { "zip_code": zip },
                        success: function(response) {
                            if (response.success) {
                                selectedRegionsDemographics.set(placeId, response.data);
                            }
                            resolve();
                        },
                        error: function(xhr, status, error) {
                            console.error(`Error fetching data for postal code ${zip}:`, error);
                            resolve();
                        }
                    });
                },
                error: function(xhr, status, error) {
                    console.error(`Error fetching state for postal code ${zip}:`, error);
                    resolve();
                }
            });
        });
    });

    Promise.all(fetchPromises)
        .then(() => {
            originalRegions = [...newSelectedRegions];
            updateAccumulatedDemographics();
            demographicTable.style.display = 'block';
            inputArea.style.display = "block";
            areaName.value = groupToEdit.name;
            franchisee.value = groupToEdit.franchisee;
            NumberOfDev.value = groupToEdit.numDevelopments;
            featureLayer.style = applyStyle;
            updateLabels();
            map.data.setStyle({ visible: true });
        })
        .catch(error => {
            console.error("Error processing regions:", error);
        })
        .finally(() => {
            if (map && map.data) {
                map.data.setStyle(applyStyle);
            }
            loader.style.display = "none";
        });
}

const styleDefaultNormalmap = {
    strokeColor: "#FFFFFF",
    strokeOpacity: 0,
    strokeWeight: 0,
    fillColor: "#FFFFFF",
    fillOpacity: 0,
};
const styleDefault = {
    strokeColor: "#000000",
    strokeOpacity: 1.0,
    strokeWeight: 1.0,
    fillColor: "#99a3a4",
    fillOpacity: 0.1,
};
const styleMouseMove = {
    strokeColor: "#000000",
    strokeOpacity: 1.0,
    strokeWeight: 3.0,
    fillColor: "#808080",
    fillOpacity: 0.5,
};
function toggleClassificationColors(button) {
    areColorsVisible = !areColorsVisible;
    featureLayer.style = applyStyle;
    button.textContent = areColorsVisible ? "Hide classification colours" : "Show classification colours";
}
function toggleClassificationColorsRecruitment(button) {
    areColorsVisibleRecruitment = !areColorsVisibleRecruitment;
    featureLayer.style = applyStyle;
    button.textContent = areColorsVisibleRecruitment ? "Hide classification colours" : "Show classification colours";
}
function createApplyStyle(defaultStyle) {
    return function applyStylemap(params) {
        if (!areColorsVisible) {
            return defaultStyle;
        }
        const placeId = params.feature.placeId;
        const region = selectedRegions.get(placeId);
        const regionRecruit = selectedRegionsRecruitment.get(placeId);
        if (isEditingArea) {
            if (region && region.groupId === editingGroupId) {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: selectedColor || 'grey',
                    fillOpacity: 0.5
                };
            }
            if (newSelectedRegions.some(r => r.placeId === placeId)) {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: selectedColor || 'grey',
                    fillOpacity: 0.5
                };
            }
        } else if (region) {
            if (region.groupId !== null) {
                const group = selectedRegionGroups.get(region.groupId);
                if (selectedGroupForDeletion === region.groupId) {
                    return {
                        strokeColor: "#FFFFFF",
                        strokeOpacity: 0,
                        strokeWeight: 0,
                        fillColor: "#FFFFFF",
                        fillOpacity: 0,
                    };
                } else {
                    return {
                        strokeColor: "#000000",
                        strokeOpacity: 1.0,
                        strokeWeight: 2.0,
                        fillColor: region.color || 'grey',
                        fillOpacity: 0.5
                    };
                }
            } else {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: "#99a3a4",
                    fillOpacity: 0.5
                };
            }
        } 
        if (isEditingAreaRecruit) {
            if (regionRecruit && regionRecruit.groupId === editingGroupIdRecruit) {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: selectedColor || 'grey',
                    fillOpacity: 0.5
                };
            }
            if (newSelectedRegionsRecruitment.some(r => r.placeId === placeId)) {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: selectedColor || 'grey',
                    fillOpacity: 0.5
                };
            }
        } else if (regionRecruit) {
            if (regionRecruit.groupId !== null) {
                const group = selectedRegionGroupsRecruitment.get(regionRecruit.groupId);
                if (selectedGroupForDeletion === regionRecruit.groupId) {
                    return {
                        strokeColor: "#FFFFFF",
                        strokeOpacity: 0,
                        strokeWeight: 0,
                        fillColor: "#FFFFFF",
                        fillOpacity: 0,
                    };
                } else {
                    return {
                        strokeColor: "#000000",
                        strokeOpacity: 1.0,
                        strokeWeight: 2.0,
                        fillColor: regionRecruit.color || 'grey',
                        fillOpacity: 0.5
                    };
                }
            } else {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: "#99a3a4",
                    fillOpacity: 0.5
                };
            }
        } 
        if (lastInteractedFeatureIds.includes(placeId)) {
            return styleMouseMove;
        }
        return defaultStyle;
    };
}

function createNewAreaStyle(params) {
    const placeId = params.feature.placeId;
    // Check area development regions
    if (isAreaDevClicked) {
        const region = selectedRegions.get(placeId);
        if (region) {
            if (region.groupId === null) {
                // Selected but not yet grouped region
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: "#99a3a4",
                    fillOpacity: 0.5
                };
            } else {
                // Already grouped region
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: region.color || 'grey',
                    fillOpacity: 0.5
                };
            }
        }
    }
    // Check recruitment regions
    if (isRecruitmentClicked) {
        const regionRecruit = selectedRegionsRecruitment.get(placeId);
        if (regionRecruit) {
            if (regionRecruit.groupId === null) {
                // Selected but not yet grouped region
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: "#99a3a4",
                    fillOpacity: 0.5
                };
            } else {
                // Already grouped region
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 1.0,
                    fillColor: regionRecruit.color || 'grey',
                    fillOpacity: 0.5
                };
            }
        }
    }
    // Unselected region with visible postal boundaries
    return {
        strokeColor: "#000000",
        strokeOpacity: 0.5,
        strokeWeight: 1.0,
        fillColor: "#FFFFFF",
        fillOpacity: 0.1
    };
}
function applyStyle(params) {
    if (isCreatingNewArea || isCreatingNewAreaRecruitment) {
        return createNewAreaStyle(params);
    }
    const placeId = params.feature.placeId;
    let region = null;
    let regionRecruit = null;
    let isSelected = false;

    if (isAreaDevClicked) {
        region = selectedRegions.get(placeId);
        isSelected = region !== undefined;
        if (isEditingArea) {
            return getEditModeStyle(region, placeId);
        }
    
        if (isSelected) {
            return getSelectedRegionStyle(region);
        }
    }
    if (isRecruitmentClicked) {
        regionRecruit = selectedRegionsRecruitment.get(placeId);
        isSelected = regionRecruit !== undefined;
        if (isEditingAreaRecruit) {
            return getEditModeStyleRecruitment(regionRecruit, placeId);
        }
    
        if (isSelected) {
            return getSelectedRegionStyleRecruitment(regionRecruit);
        }
    }
    return {
        strokeColor: "#000000",
        strokeOpacity: 0.1,
        strokeWeight: 0.5,
        fillColor: "#FFFFFF",
        fillOpacity: 0
    };
    
}
function getEditModeStyle(region, placeId) {
    if (region && region.groupId === editingGroupId) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 2.0,
            fillColor: selectedColor || 'grey',
            fillOpacity: 0.5
        };
    }
    if (newSelectedRegions.some(r => r.placeId === placeId)) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 2.0,
            fillColor: selectedColor || 'grey',
            fillOpacity: 0.5
        };
    }
    return {
        strokeColor: "#000000",
        strokeOpacity: 0.5,
        strokeWeight: 1.0,
        fillColor: "#FFFFFF",
        fillOpacity: 0.1
    };
}
function getEditModeStyleRecruitment(region, placeId) {
    if (region && region.groupId === editingGroupIdRecruit) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 2.0,
            fillColor: selectedColorRecruitment || 'grey',
            fillOpacity: 0.5
        };
    }
    if (newSelectedRegionsRecruitment.some(r => r.placeId === placeId)) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 2.0,
            fillColor: selectedColorRecruitment || 'grey',
            fillOpacity: 0.5
        };
    }
    return {
        strokeColor: "#000000",
        strokeOpacity: 0.5,
        strokeWeight: 1.0,
        fillColor: "#FFFFFF",
        fillOpacity: 0.1
    };
}
function getSelectedRegionStyle(region) {
    if (region.groupId !== null) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 1.0,
            fillColor: region.color || 'grey',
            fillOpacity: selectedGroupForDeletion === region.groupId ? 0.2 : 0.5
        };
    }
    return {
        strokeColor: "#000000",
        strokeOpacity: 1.0,
        strokeWeight: 1.0,
        fillColor: "#99a3a4",
        fillOpacity: 0.5
    };
}
function getSelectedRegionStyleRecruitment(region) {
    if (region.groupId !== null) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 1.0,
            fillColor: region.color || 'grey',
            fillOpacity: selectedGroupForDeletionRecruitment === region.groupId ? 0.2 : 0.5
        };
    }
    return {
        strokeColor: "#000000",
        strokeOpacity: 1.0,
        strokeWeight: 1.0,
        fillColor: "#99a3a4",
        fillOpacity: 0.5
    };
}
function initializeCreateNewAreaButtons() {
    const createNewAreaBtn = document.getElementById("createNewAreaBtn");
    if (createNewAreaBtn) {
        createNewAreaBtn.addEventListener("click", async function() {
            isCreatingNewArea = true;
            isCreatingNewAreaRecruitment = false;
            await initCustomMap();
            
            var table = document.getElementById('demographic-table');
            if (table.style.display === 'none' || table.style.display === '') {
                table.style.display = 'block';
                this.textContent = 'Hide Demographic Data';
            } else {
                table.style.display = 'none';
                this.textContent = 'Show Demographic Data';
            }
        });
    }
    const createNewAreaBtnRecruitment = document.getElementById("createNewAreaBtnRecruitment");
    if (createNewAreaBtnRecruitment) {
        createNewAreaBtnRecruitment.addEventListener("click", async function() {
            isCreatingNewArea = false;
            isCreatingNewAreaRecruitment = true;
            await initCustomMap();
            
            var table = document.getElementById('demographic-table-recruitment');
            if (table.style.display === 'none' || table.style.display === '') {
                table.style.display = 'block';
                this.textContent = 'Hide Demographic Data';
            } else {
                table.style.display = 'none';
                this.textContent = 'Show Demographic Data';
            }
        });
    }
}

// Cleanup function for both modes
function exitCreateNewAreaMode() {
    isCreatingNewArea = false;
    isCreatingNewAreaRecruitment = false;
    if (featureLayer) {
        featureLayer.style = applyStyle;
    }
}
function toggleDemographicTable(tableId, button) {
    const table = document.getElementById(tableId);
    if (table) {
        if (table.style.display === 'none' || table.style.display === '') {
            table.style.display = 'block';
            button.textContent = 'Hide Demographic Data';
        } else {
            table.style.display = 'none';
            button.textContent = 'Show Demographic Data';
        }
    }
}
function get_all_place_ids(){
    featureLayer.style = (params) => {
        const feature = params.feature;
        if (feature) {
            const placeId = feature.Hg;
            all_place_ids.push(placeId)
        }
    return applyStyle(params);
    };
        setTimeout(
              function()
              {
                load_postal_data(all_place_ids)
                return all_place_ids
              }, 1000);
}
function updateLabels() {
    if (isAreaDevClicked && areRegionsVisible) {
        updateAreaDevLabels();
    }
    if (isRecruitmentClicked && areRegionsVisibleRecruit) {
        updateRecruitmentLabels();
    }
}
function updateAreaDevLabels() {
    labels.forEach(label => label.setMap(null));
    labels = [];
    if (!areRegionsVisible) return; 
    selectedRegionGroups.forEach((group, groupId) => {
        if (group.regions && group.regions.length > 0) {
            const regions = group.regions.map(placeId => selectedRegions.get(placeId)).filter(Boolean);
            if (regions.length > 0) {
                const centerLat = regions.reduce((sum, r) => sum + r.lat, 0) / regions.length;
                const centerLng = regions.reduce((sum, r) => sum + r.lng, 0) / regions.length;
                const centralRegion = regions.reduce((closest, current) => {
                    const currentDist = Math.pow(current.lat - centerLat, 2) + Math.pow(current.lng - centerLng, 2);
                    const closestDist = Math.pow(closest.lat - centerLat, 2) + Math.pow(closest.lng - centerLng, 2);
                    return currentDist < closestDist ? current : closest;
                }, regions[0]);
                const labelText = `${group.franchisee} - ${group.name} (${group.numDevelopments})`;
                createLabel(centralRegion, labelText, labels);
            }
        }
    });
}
function updateRecruitmentLabels() {
    labelsRecruitment.forEach(label => label.setMap(null));
    labelsRecruitment = [];
    if (!areRegionsVisibleRecruit) return; 
    selectedRegionGroupsRecruitment.forEach((group, groupId) => {
        if (group.regions && group.regions.length > 0) {
            const regions = group.regions.map(placeId => selectedRegionsRecruitment.get(placeId)).filter(Boolean);
            if (regions.length > 0) {
                const centerLat = regions.reduce((sum, r) => sum + r.lat, 0) / regions.length;
                const centerLng = regions.reduce((sum, r) => sum + r.lng, 0) / regions.length;
                const centralRegion = regions.reduce((closest, current) => {
                    const currentDist = Math.pow(current.lat - centerLat, 2) + Math.pow(current.lng - centerLng, 2);
                    const closestDist = Math.pow(closest.lat - centerLat, 2) + Math.pow(closest.lng - centerLng, 2);
                    return currentDist < closestDist ? current : closest;
                }, regions[0]);
                const labelText = `${group.recruitmentArea} - ${group.name} - ${group.category}`;
                createLabel(centralRegion, labelText, labelsRecruitment);
            }
        }
    });
}
function createLabel(region, labelText, labelArray) {
    const label = new google.maps.Marker({
        position: { lat: region.lat, lng: region.lng },
        map: map,
        label: {
            text: labelText,
            color: 'black',
            fontWeight: "700",
            fontSize: "14px",
            fontFamily: 'Arial',
            className: 'map-label'
        },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
        }
    });
    
    labelArray.push(label);
}
function saveRegionsRecruitment() {
    const selectedRegionsRecruitmentJSON = Array.from(selectedRegionsRecruitment.values());
    const selectedRegionGroupsRecruitmentJSON = Array.from(selectedRegionGroupsRecruitment.values());
    $.ajax({
        url: "/save_regions_recruitment",
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ selectedRegionsRecruitment: selectedRegionsRecruitmentJSON, selectedRegionGroupsRecruitment: selectedRegionGroupsRecruitmentJSON }),
        success: function(response) {
            if (response.success) {
            } else {
            }
        },
        error: function(xhr, status, error) {
            console.log(status, "Error sending data:", error);
        }
    });
}
function actionBtnRecruitment() {
    document.getElementById("ActionBtnRecruitment").addEventListener("click", function(){
        document.getElementById("RecruitmentViewRight").style.display = "block";
        document.getElementById("demographic-table-recruitment").style.display = "none";
    })
}
function closeBtnRecruitment() {
    document.getElementById("CloseBtnRecruitment").addEventListener("click", function(){
        selectedGroupForDeletionRecruitment = null;
        highlightSelectedGroupRecruitment();
        document.getElementById("demographic-table-recruitment").style.display = "none";
    })
}
function GoBackToTableRecruitment() {
    document.getElementById("BackToTableRecruitment").addEventListener("click", function(){
        document.getElementById("demographic-table-recruitment").style.display = "block";
        document.getElementById("RecruitmentViewRight").style.display = "none";
    })
}
function displayGroupDemographicsRecruitment(demographics) {
    const table = document.getElementById('demographicTableRecruitment');
    const tbodies = table.getElementsByTagName('tbody');
    const rows = [];

    for (let tbody of tbodies) {
        for (let row of tbody.getElementsByTagName('tr')) {
            rows.push(row);
        }
    }
    const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    for (let row of rows) {
        const label = row.cells[0].textContent.trim();
        const valueCell = row.cells[1];

        switch(label) {
            case 'Population':
                valueCell.textContent = formatNumber(demographics.population);
                break;
            case 'Households':
                valueCell.textContent = formatNumber(demographics.total_households);
                break;
            case 'Households Less Than $10,000 (Est)':
                valueCell.textContent = formatNumber(demographics.income_less_than_10k);
                break;
            case 'Household Income - $10,000 to $14,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_10k_15k);
                break;
            case 'Household Income - $15,000 to $24,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_15k_25k);
                break;
            case 'Household Income - $25,000 to $34,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_25k_35k);
                break;
            case 'Household Income - $35,000 to $49,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_35k_50k);
                break;
            case 'Household Income - $50,000 to $74,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_50k_75k);
                break;
            case 'Household Income - $75,000 to $99,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_75k_100k);
                break;
            case 'Household Income - $100,000 to $149,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_100k_150k);
                break;
            case 'Household Income - $150,000 to $199,999 (Est)':
                valueCell.textContent = formatNumber(demographics.income_150k_200k);
                break;
            case 'Household Income - $200,000 and over (Est)':
                valueCell.textContent = formatNumber(demographics.income_200k_plus);
                break;
            default:
                valueCell.textContent = '0';
        }
    }
}
function renderPieChartRecruitment() {
    $.ajax({
        url: "/load_regions_recruitment",
        method: "GET",
        success: function(response) {
            if (response.status === 'success') {
                const savedRegions = response.regions || [];
                const classificationCounts = new Map();
                const classificationColors = new Map();
                savedRegions.forEach(region => {
                    const classification = region.classificationText || 'Unclassified';
                    const color = region.color || '#99a3a4';
                    if (classificationCounts.has(classification)) {
                        classificationCounts.set(classification, classificationCounts.get(classification) + 1);
                    } else {
                        classificationCounts.set(classification, 1);
                        classificationColors.set(classification, color);
                    }
                });
                const classifications = Array.from(classificationCounts.entries()).map(([name, count]) => ({
                    name,
                    color: classificationColors.get(name),
                    count
                }));
                const layerInfoView = document.getElementById('layerInfoViewRecruitment');
                const existingCanvas = layerInfoView.querySelector('canvas');
                const existingRecords = layerInfoView.querySelector('.records-count');
                if (existingCanvas) existingCanvas.remove();
                if (existingRecords) existingRecords.remove();
                const totalRecords = classifications.reduce((sum, item) => sum + item.count, 0);
                const recordsDiv = document.createElement('div');
                recordsDiv.className = 'records-count';
                recordsDiv.textContent = `Total Records: ${totalRecords}`;
                layerInfoView.appendChild(recordsDiv);
                const chartCanvas = document.createElement('canvas');
                chartCanvas.id = 'classificationPieChartRecruitment';
                layerInfoView.appendChild(chartCanvas);
                const chartLabels = classifications.map(item => item.name);
                const chartData = classifications.map(item => item.count);
                const chartColors = classifications.map(item => item.color);
                new Chart(chartCanvas, {
                    type: 'pie',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: chartData,
                            backgroundColor: chartColors
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw;
                                        const percentage = ((value / totalRecords) * 100).toFixed(1);
                                        return `${label}: ${value} records (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
                const legendDiv = document.createElement('div');
                legendDiv.className = 'classification-legend';
                legendDiv.style.marginTop = '20px';
                classifications.forEach(item => {
                    const legendItem = document.createElement('div');
                    legendItem.style.display = 'flex';
                    legendItem.style.alignItems = 'center';
                    legendItem.style.marginBottom = '8px';
                    const colorBox = document.createElement('span');
                    colorBox.style.width = '20px';
                    colorBox.style.height = '20px';
                    colorBox.style.backgroundColor = item.color;
                    colorBox.style.display = 'inline-block';
                    colorBox.style.marginRight = '8px';
                    const text = document.createElement('span');
                    const percentage = ((item.count / totalRecords) * 100).toFixed(1);
                    text.textContent = `${item.name}: ${item.count} records (${percentage}%)`;
                    legendItem.appendChild(colorBox);
                    legendItem.appendChild(text);
                    legendDiv.appendChild(legendItem);
                });
                layerInfoView.appendChild(legendDiv);
            } else {
                console.error('Error fetching saved regions:', response.message);
            }
        }
    });
}
function saveNotes(groupID) {
    const notes = document.getElementById('notesTextarea').value;
    const groupId = groupID;
    fetch('/save_notes', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        groupId: groupId,
        note: notes
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
        console.log('Notes saved successfully!');
        bootstrap.Modal.getInstance(document.getElementById('notesModal')).hide();
        } else {
        console.log('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        console.log('Something went wrong!');
    });
}

function saveNotesRecruit(groupID) {
    const notes = document.getElementById('notesTextarea').value;
    const groupId = groupID;
    fetch('/save_notes_recruitment', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        groupId: groupId,
        note: notes
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
        console.log('Notes saved successfully!');
        bootstrap.Modal.getInstance(document.getElementById('notesModal')).hide();
        } else {
        console.log('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        console.log('Something went wrong!');
    });
}

function populateTableRecruitment() {
    const tableBody = document.querySelector("#dataTableRecruitment tbody");
    tableBody.innerHTML = "";
    const savedRegions = Array.from(selectedRegionsRecruitment.values());
    const groupedRegions = {};
    savedRegions.forEach(region => {
        if (!groupedRegions[region.groupId]) {
            groupedRegions[region.groupId] = {
                id: region.groupId,
                name: region.displayName,
                color: region.color,
                classifications: new Set()
            };
        }
        groupedRegions[region.groupId].classifications.add(region.classificationText);
    });
    Object.values(groupedRegions).forEach(group => {
        const row = document.createElement("tr");
        const classifications = Array.from(group.classifications).join(", ");
        row.innerHTML = `
            <td>${group.name}</td>
            <td>${group.id}</td>
            <td style="background-color: ${group.color}; color: #fff;">
                Under Constructon
            </td>
        `;
        tableBody.appendChild(row);
    });
}
function exportToCSVRecruitment() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Unique Key,Classification\n";
    const savedRegions = JSON.parse(localStorage.getItem('selectedRegionsRecruitment')) || [];
    savedRegions.forEach(region => {
      csvContent += `${region.displayName || `Feature ${region.placeId}`}," ",${region.classification || "No classification"}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const date = new Date();
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recruitment_data_${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
function returnToMapRecruitment() {
    document.getElementById("tableViewRecruitment").style.display = "none";
    document.getElementById("map-container").style.display = "block";
}
function load_postal_data_Recruitment(data_list_recruit){
    $.ajax({
            url: "/load_postal",
            method: "POST",
            data: {
                'total_data':JSON.stringify(data_list_recruit)
            },
            success: function(response) {
                if (response.success) {
                   var retrieved_data = JSON.parse(response.retrieved_data)
                   for ( var itd=0;itd<retrieved_data.length;itd++ ){
                   var this_retrieved_data = retrieved_data[itd]
                   var latLng = this_retrieved_data[0];
                   var postal_no = this_retrieved_data[1];
                   var place_id = this_retrieved_data[2];

                try{
                   createLabelOverlay( JSON.parse(latLng),postal_no)
                   }
                catch{console.log('..')}
                  }

            }else{console.log('')}
            },
            error: function(xhr, status, error) {
                console.log("Error fetching data. Please try again.");
            }
        });
}
function createLabelOverlayRecruitment(latLng, postalCode) {
    try{
    var existingOverlay = labelOverlaysRecruitment.find(overlay => overlay.getPosition().equals(latLng));
    if (existingOverlay) {
        return;
    }}
    catch{}
    var labelOverlay = new google.maps.OverlayView();
    labelOverlay.setMap(map);
    labelOverlay.onAdd = function() {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.background = 'transparent';
        div.style.padding = '2px';
        div.style.fontWeight = '500';
        div.style.fontSize = '12px';
        div.style.color = 'black';
        div.style.textShadow = '2px 2px 4px white, -2px -2px 4px white, 2px -2px 4px white, -2px 2px 4px white';
        div.textContent = postalCode;
        this.div_ = div;
        var panes = this.getPanes();
        panes.overlayLayer.appendChild(div);
    };
    labelOverlay.draw = function() {
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(latLng);
        var div = this.div_;
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
    };
    labelOverlay.onRemove = function() {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    };
    labelOverlay.getPosition = function() {
        return latLng;
    };
    labelOverlaysRecruitment.push(labelOverlay);
}
async function getDisplayNameRecruitment(feature, latLng) {
    if (typeof feature.fetchPlace === 'function') {
        try {
            const place = await feature.fetchPlace();
            return place.displayName || feature.name || `Feature ${feature.placeId}`;
        } catch (error) {
            console.error("Error fetching place:", error);
        }
    }
    const geocoder = new google.maps.Geocoder();
    try {
        const geocodeResult = await geocoder.geocode({ location: latLng });
        if (geocodeResult && geocodeResult.results && geocodeResult.results[0]) {
            return geocodeResult.results[0].formatted_address;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
    }
    return feature.name || `Feature ${feature.placeId}`;
}
function handleSubmitRecruitment() {
    newSelectedRegionsRecruitment = Array.from(selectedRegionsRecruitment.values()).filter(region => region.groupId === null);
    if (newSelectedRegionsRecruitment.length > 0) {
        document.getElementById("input-area-recruitment").style.display = "block";
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.color-option[data-color="white"]')?.classList.add('selected');
        selectedColorRecruitment = document.querySelector('.color-option[data-color="white"]')?.dataset.color || 'white';
    } else {
        console.log("No new regions selected. Please click on one or more regions before submitting.");
    }
}
function hide_demographic_table_Recruitment() {
    var table = document.getElementById('demographic-table-recruitment');
        if (table.style.display === 'block') {
            table.style.display = 'none';
            var toggleButton = document.getElementById('toggle-demographic-btn');
            toggleButton.textContent = 'Show Demographic Data';
        }
}
function resetDemographicsTableRecruitment() {
    const table = document.getElementById('demographicTable');
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');
    for (let row of rows) {
        const valueCell = row.cells[1];
        valueCell.textContent = '0';
    }
}
function addNewRegionRecruitment(feature, latLng) {
    resetDemographicsTableRecruitment();
    const placeId = feature.placeId;
    getDisplayNameRecruitment(feature, latLng).then(displayName => {
        const postalCode = displayName.match(/\d{5}/)?.[0] || "00000";
        updateZipCodeInputRecruitment(postalCode, 'add');
        add_state_rec(postalCode);
        $.ajax({
            url: "/get_data",
            method: "GET",
            data: {
                "zip_code": postalCode
            },
            success: function(response) {
                if (response.success) {
                    selectedRegionsRecruitmentDemographics.set(placeId, response.data);
                    updateAccumulatedDemographicsRecruitment();
                    document.getElementById('demographic-table-recruitment').style.display = 'block';
                    document.getElementById('demographic-table').style.display = 'none';
                    document.getElementById('demographic-table-radial').style.display = 'none';
                } else {
                    console.log("Could not find data for ZIP code: " + postalCode);
                }
            },
            error: function(xhr, status, error) {
                console.log("Error fetching data. Please try again.");
            }
        });
        selectedRegionsRecruitment.set(placeId, {
            displayName: displayName,
            placeId: placeId,
            featureType: feature.featureType,
            lat: latLng.lat(),
            lng: latLng.lng(),
            groupId: null,
            color: null,
            postalCode: postalCode
        });
        featureLayer.style = applyStyle;
        updateLabels();
    });
}
async function addNewRegionForEditRecruitment(feature, latLng) {
    const placeId = feature.placeId;
    const displayName = await getDisplayNameRecruitment(feature, latLng);
    const postalCode = displayName.match(/\d{5}/)?.[0] || "00000";
    updateZipCodeInputRecruitment(postalCode, 'add');
    add_state_rec(postalCode);
    $.ajax({
        url: "/get_data",
        method: "GET",
        data: {
            "zip_code": postalCode
        },
        success: function(response) {
            if (response.success) {
                selectedRegionsRecruitmentDemographics.set(placeId, response.data);
                updateAccumulatedDemographicsRecruitment();
                document.getElementById('demographic-table-recruitment').style.display = 'block';
                document.getElementById('demographic-table').style.display = 'none';
                document.getElementById('demographic-table-radial').style.display = 'none';
                const newRegionRecruit = {
                    displayName: displayName,
                    placeId: placeId,
                    featureType: feature.featureType,
                    lat: latLng.lat(),
                    lng: latLng.lng(),
                    groupId: editingGroupId,
                    color: selectedColor,
                    postalCode: postalCode
                };
                selectedRegionsRecruitment.set(placeId, newRegionRecruit);
                newSelectedRegionsRecruitment.push(newRegionRecruit);
                featureLayer.style = applyStyle;
                updateLabels();
                map.data.setStyle({visible: true});
            } else {
                console.log("Could not find data for ZIP code: " + postalCode);
            }
        },
        error: function(xhr, status, error) {
            console.log("Error fetching data. Please try again.");
        }
    });
}
function calculateAccumulatedDemographicsRecruitment() {
    const accumulatedData = {
        population: 0,
        total_households: 0,
        income_less_than_10k : 0,
        income_10k_15k: 0,
        income_15k_25k: 0,
        income_25k_35k: 0,
        income_35k_50k: 0,
        income_50k_75k: 0,
        income_75k_100k: 0,
        income_100k_150k: 0,
        income_150k_200k: 0,
        income_200k_plus: 0
    };
    selectedRegionsRecruitmentDemographics.forEach(data => {
        accumulatedData.population = (parseFloat(accumulatedData.population) + parseFloat(data.population || 0)).toFixed(2);
        accumulatedData.total_households = (parseFloat(accumulatedData.total_households) + parseFloat(data.total_households || 0)).toFixed(2);
        accumulatedData.income_less_than_10k = (parseFloat(accumulatedData.income_less_than_10k) + parseFloat(data.income_less_than_10k || 0)).toFixed(2);
        accumulatedData.income_10k_15k = (parseFloat(accumulatedData.income_10k_15k) + parseFloat(data.income_10k_15k || 0)).toFixed(2);
        accumulatedData.income_15k_25k = (parseFloat(accumulatedData.income_15k_25k) + parseFloat(data.income_15k_25k || 0)).toFixed(2);
        accumulatedData.income_25k_35k = (parseFloat(accumulatedData.income_25k_35k) + parseFloat(data.income_25k_35k || 0)).toFixed(2);
        accumulatedData.income_35k_50k = (parseFloat(accumulatedData.income_35k_50k) + parseFloat(data.income_35k_50k || 0)).toFixed(2);
        accumulatedData.income_50k_75k = (parseFloat(accumulatedData.income_50k_75k) + parseFloat(data.income_50k_75k || 0)).toFixed(2);
        accumulatedData.income_75k_100k = (parseFloat(accumulatedData.income_75k_100k) + parseFloat(data.income_75k_100k || 0)).toFixed(2);
        accumulatedData.income_100k_150k = (parseFloat(accumulatedData.income_100k_150k) + parseFloat(data.income_100k_150k || 0)).toFixed(2);
        accumulatedData.income_150k_200k = (parseFloat(accumulatedData.income_150k_200k) + parseFloat(data.income_150k_200k || 0)).toFixed(2);
        accumulatedData.income_200k_plus = (parseFloat(accumulatedData.income_200k_plus) + parseFloat(data.income_200k_plus || 0)).toFixed(2);
    });
    Object.keys(accumulatedData).forEach(key => {
        accumulatedData[key] = parseFloat(accumulatedData[key]);
    });
    return accumulatedData;
}
function updateAccumulatedDemographicsRecruitment() {
    const accumulatedData = calculateAccumulatedDemographicsRecruitment();
    const table = document.getElementById('demographicTableRecruitment');
    const tbodies = table.getElementsByTagName('tbody');
    const rows = [];

    for (let tbody of tbodies) {
        for (let row of tbody.getElementsByTagName('tr')) {
            rows.push(row);
        }
    }
    const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    for (let row of rows) {
        const label = row.cells[0].textContent.trim();
        const valueCell = row.cells[1];

        switch(label) {
            case 'Population':
                valueCell.textContent = formatNumber(accumulatedData.population);
                break;
            case 'Households':
                valueCell.textContent = formatNumber(accumulatedData.total_households);
                break;
            case 'Households Less Than $10,000 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_less_than_10k);
                break;
            case 'Household Income - $10,000 to $14,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_10k_15k);
                break;
            case 'Household Income - $15,000 to $24,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_15k_25k);
                break;
            case 'Household Income - $25,000 to $34,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_25k_35k);
                break;
            case 'Household Income - $35,000 to $49,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_35k_50k);
                break;
            case 'Household Income - $50,000 to $74,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_50k_75k);
                break;
            case 'Household Income - $75,000 to $99,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_75k_100k);
                break;
            case 'Household Income - $100,000 to $149,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_100k_150k);
                break;
            case 'Household Income - $150,000 to $199,999 (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_150k_200k);
                break;
            case 'Household Income - $200,000 and over (Est)':
                valueCell.textContent = formatNumber(accumulatedData.income_200k_plus);
                break;
            default:
                valueCell.textContent = '0';
        }
    }
}
function highlightSelectedGroupRecruitment() {
    featureLayer.style = applyStyle;
    updateLabelsRecruitment();
}
function handleDeleteRecruitment() {
    document.getElementById("confirmDeleteButton").addEventListener("click", () => {
        if (selectedGroupForDeletionRecruitment !== null) {
            const groupToDelete = selectedRegionGroupsRecruitment.get(selectedGroupForDeletionRecruitment);
            if (groupToDelete) {
                // Make an AJAX call to delete the group from the database
                $.ajax({
                    url: "/delete_region_group_recruitment",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ groupId: selectedGroupForDeletionRecruitment}),
                    success: function(response) {
                        if (response.status === 'success') {
                            groupToDelete.regions.forEach(placeId => {
                            selectedRegionsRecruitment.delete(placeId);
                        });
                            selectedRegionGroupsRecruitment.delete(selectedGroupForDeletionRecruitment);
                            selectedGroupForDeletionRecruitment = null;
                            resetDemographicsTableRecruitment();
                            saveRegionsRecruitment();
                            featureLayer.style = applyStyle;
                            updateLabelsRecruitment();
                            document.getElementById("demographic-table-recruitment").style.display = "none";
                            document.getElementById("RecruitmentViewRight").style.display = "none";
                        } else {
                            console.error(response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error("Error deleting region group:", error);
                    }
                });
            }
        } else {
            console.log("No group selected for deletion.");
        }
        $('#delet-area').modal('hide');
    });
    updateLabels;
}
function handleEditAreaRecruitment() {
    const loader = document.getElementById("loader-wrapper");
    const RecruitmentViewRight = document.getElementById("RecruitmentViewRight");
    const demographicTableRec = document.getElementById('demographic-table-recruitment');
    const inputAreaRec = document.getElementById("input-area-recruitment");
    const nameRec = document.getElementById("area-name-recruitment");
    const recruitmentArea = document.getElementById("recruitmentArea");
    const PotStoreCount = document.getElementById("PotStoreCount");
    const zipCodesRecruitment = document.getElementById("zipCodesRecruitment");
    const stateRecruitment = document.getElementById("stateRecruitment");

    zipCodesRecruitment.value = "";
    stateRecruitment.value = "";
    recruitmentArea.value = "";
    PotStoreCount.value = "";

    loader.style.display = "block";
    RecruitmentViewRight.style.display = "none";
    demographicTableRec.style.display = 'none';

    if (selectedGroupForDeletionRecruitment === null) {
        loader.style.display = "none";
        alert("Please select an area to edit first");
        return;
    }

    isEditingAreaRecruit = true;
    isEditingArea = false;
    editingGroupIdRecruit = selectedGroupForDeletionRecruitment;

    const groupToEdit = selectedRegionGroupsRecruitment.get(editingGroupIdRecruit);
    console.log("Group to Edit:", groupToEdit);
    newSelectedRegionsRecruitment = [];
    selectedRegionsRecruitmentDemographics.clear();

    if (!groupToEdit || !groupToEdit.regions) {
        loader.style.display = "none";
        return;
    }

    if (groupToEdit.category) {
        const radioButton = document.querySelector(`input[name="category"][value="${groupToEdit.category}"]`);
        console.log("groupToEdit.category:", groupToEdit.category);
        if (radioButton) {
            radioButton.checked = true;
            selectedColorRecruitment = (groupToEdit.category === "Primary Area")
                ? "rgb(255, 255, 153)"
                : "rgb(230, 230, 0)";
            if (featureLayer) {
                featureLayer.style = applyStyle;
            }
        } else {
            const defaultRadio = document.querySelector('input[name="category"][value="Primary Area"]');
            if (defaultRadio) {
                defaultRadio.checked = true;
                selectedColorRecruitment = "rgb(255, 255, 153)";
            }
        }
    }

    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', function () {
            selectedColorRecruitment = (this.value === "Primary Area")
                ? "rgb(255, 255, 153)"
                : "rgb(230, 230, 0)";
            if (featureLayer) {
                featureLayer.style = applyStyle;
            }
        });
    });

    const uniqueStates = new Set();
    const processedZipCodes = new Set();

    const fetchPromises = groupToEdit.regions.map(placeId => {
        const region = selectedRegionsRecruitment.get(placeId);
        if (!region) return Promise.resolve();

        const zip = region.postalCode;
        const clonedRegion = JSON.parse(JSON.stringify(region));
        newSelectedRegionsRecruitment.push(clonedRegion);
        updateZipCodeInputRecruitment(zip, 'add');

        // If already processed, skip AJAX calls
        if (processedZipCodes.has(zip)) {
            return Promise.resolve();
        }
        processedZipCodes.add(zip);

        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/get_state",
                method: "GET",
                data: { "zip_code": zip },
                success: function (stateResponse) {
                    if (stateResponse.success) {
                        uniqueStates.add(stateResponse.data);
                        stateRecruitment.value = Array.from(uniqueStates).join(', ');
                    }

                    $.ajax({
                        url: "/get_data",
                        method: "GET",
                        data: { "zip_code": zip },
                        success: function (response) {
                            if (response.success) {
                                selectedRegionsRecruitmentDemographics.set(placeId, response.data);
                            }
                            resolve();
                        },
                        error: function (xhr, status, error) {
                            console.error(`Error fetching data for postal code ${zip}:`, error);
                            resolve();
                        }
                    });
                },
                error: function (xhr, status, error) {
                    console.error(`Error fetching state for postal code ${zip}:`, error);
                    resolve();
                }
            });
        });
    });

    Promise.all(fetchPromises)
        .then(() => {
            originalRegionsRecruit = [...newSelectedRegionsRecruitment];
            updateAccumulatedDemographicsRecruitment();
            demographicTableRec.style.display = 'block';
            inputAreaRec.style.display = "block";
            nameRec.value = groupToEdit.name;
            recruitmentArea.value = groupToEdit.recruitmentArea;
            PotStoreCount.value = groupToEdit.PotStoreCount;
            if (featureLayer) {
                featureLayer.style = applyStyle;
            }
            updateLabels();
            map.data.setStyle({ visible: true });
        })
        .catch(error => {
            console.error("Error processing recruitment regions:", error);
        })
        .finally(() => {
            if (map && map.data) {
                map.data.setStyle(applyStyle);
            }
            loader.style.display = "none";
        });
}


function updateLabelsRecruitment() {
    overlaysRecruitment.forEach(overlay => overlay.setMap(null));
    labelsRecruitment.forEach(label => label.setMap(null));
    overlaysRecruitment = [];
    labelsRecruitment = [];
    if (selectedRegionGroupsRecruitment.size > 0) {
        selectedRegionGroupsRecruitment.forEach((group, groupId) => {
            if (group.regions.length > 0) {
                const firstRegion = selectedRegionsRecruitment.get(group.regions[0]);
                if (firstRegion) {
                    const labelText = prefixRecruitment ? `${prefixRecruitment} ${group.name}` : group.name;
                    const label = new google.maps.Marker({
                        position: { lat: firstRegion.lat, lng: firstRegion.lng },
                        map: map,
                        label: {
                            text: labelText,
                            color: 'black',
                            fontWeight: "700",
                            fontSize: "14px",
                            fontFamily: 'Arial',
                            className: 'map-label'
                        },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 0,
                        }
                    });
                    labelsRecruitment.push(label);
                }
            }
        });
    }
}
/////////////////////////////////////////////////////////////////
function actionBtnRadial() {
    document.getElementById("ActionBtnRadial").addEventListener("click", function(){
        document.getElementById("RadialViewRight").style.display = "block";
        document.getElementById("demographic-table-radial").style.display = "none";
    })
}
function closeBtnRadial() {
    document.getElementById("CloseBtnRadial").addEventListener("click", function(){
        selectedCircleId = null;
        resetCircleHighlight(selectedCircleId);
        document.getElementById("demographic-table-radial").style.display = "none";
    })
}
function handleDeleteRadial() {
    const confirmDeleteButtonRadial = document.getElementById("confirmDeleteButton");
    confirmDeleteButtonRadial.addEventListener("click", () => {
        if (activeCircle) {
            const circleId = activeCircle.id;
            confirmDeleteButtonRadial.disabled = true;
            $.ajax({
                url: `/delete_circle/${circleId}`,
                method: "DELETE",
                success: function(response) {
                    if (response.status === 'success') {
                        activeCircle.setMap(null);
                        activeCircle = null;
                        const circleData = circles.get(circleId);
                        if (circleData && circleData.label) {
                            circleData.label.setMap(null);
                        }
                        circles.delete(circleId);
                        $('#delet-area').modal('hide');
                        document.getElementById("demographic-table-radial").style.display = "none";
                        document.getElementById("RadialViewRight").style.display = "none";
                    } else {
                        console.error("Error deleting circle:", response.message);
                    }
                },
                error: function(xhr, status, error) {
                    console.error("AJAX error while deleting circle:", status, error);
                },
                complete: function() {
                    confirmDeleteButtonRadial.disabled = false;
                }
            });
        } else {
            console.log("No circle selected for deletion.");
        }
    });
}
function populateCircleTable() {
    const tableBody = document.querySelector("#dataTableRadial tbody");
    tableBody.innerHTML = "";
    const savedCirclesArray = Array.from(circles.values());
    savedCirclesArray.forEach(circleData => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${circleData.data.name}</td>
            <td>${circleData.data.id}</td>
            <td style="background-color: ${circleData.data.color}; color: #fff;">
                ${circleData.data.classificationText || ''}
            </td>
            <td></td>
        `;
        tableBody.appendChild(row);
    });
}
function populateTableForCircle(circleId) {
    accumulatedData = null;
    const circleData = circles.get(circleId);
    if (circleData && circleData.data.demographics) {
        const table = document.getElementById("demographic-table-radial");
        if (selectedCircleId === circleId) {
            if (table.style.display === "block") {
                table.style.display = "none";
                resetCircleHighlight(circleId);
                selectedCircleId = null;
            } else {
                table.style.display = "block";
                document.getElementById("demographic-table-recruitment").style.display = "none";
                document.getElementById("demographic-table").style.display = "none";
                highlightCircle(circleId);
                RadialpopulateTable(circleData.data.demographics);
                selectedCircleId = circleId;
            }
        } else {
            table.style.display = "block";
            document.getElementById("demographic-table-recruitment").style.display = "none";
            document.getElementById("demographic-table").style.display = "none";
            resetCircleHighlight(selectedCircleId);
            highlightCircle(circleId);
            RadialpopulateTable(circleData.data.demographics);
            selectedCircleId = circleId;
        }
    } else {
        resetDemographicTable();
    }
}
function highlightCircle(circleId) {
    const circleData = circles.get(circleId);
    if (circleData && circleData.circle) {
        const currentColor = circleData.data.color;
        circleData.circle.setOptions({
            fillOpacity: 0.4,
        });
    }
}
function resetCircleHighlight(circleId) {
    if (!circleId) return;
    const circleData = circles.get(circleId);
    if (circleData && circleData.circle) {
        circleData.circle.setOptions({
            fillOpacity: 0.2,
        });
    }
}
function resetDemographicTable() {
    selectedCircleId = null;
    accumulatedData = {
        population: 0,
        median_income: 0,
    };
    document.querySelector("#demographicTableRadial tbody").rows[0].cells[1].textContent = '';
    document.querySelector("#demographicTableRadial tbody").rows[1].cells[1].textContent = '';
    circles.forEach((data, id) => {
        resetCircleHighlight(id);
    });
}
function setupMapClickListener() {
    google.maps.event.addListener(map, 'click', function(event) {
        const demographicTableRadial = document.getElementById("demographic-table-radial");
        if (selectedCircleId && circles[selectedCircleId] && circles[selectedCircleId].cid) {
            return;
        }
        if (!lastInteractedFeatureIds || lastInteractedFeatureIds.length === 0) {
            demographicTableRadial.style.display = "none";
            accumulatedData = null;
            if (selectedCircleId) {
                resetCircleHighlight(selectedCircleId);
                selectedCircleId = null;
            }
        }
    });
}

function resetGroupHighlight(groupId) {
    featureLayer.style = (feature) => applyStyle(feature);
    updateLabels();
}
function setupAutocompleteTrigger(input) {
    input.addEventListener("keyup", () => {
        if (input.value.length >= 3 && !autocomplete) {
            initAutocomplete(input);
            resetDemographicTable()
        }
    });
}
function initAutocomplete(input) {
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.setTypes(["geocode"]);
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            selectedLocation = { lat: lat, lng: lng };
            if (currentMarker) {
                currentMarker.setMap(null);
            }
            currentMarker = new google.maps.Marker({
                map: map,
                position: selectedLocation,
                animation: google.maps.Animation.DROP
            });
            map.setCenter(selectedLocation);
            map.setZoom(13);
        } else {
            console.log("No geometry details available for this address.");
        }
    });
}
function RadialpopulateTable(data) {
    document.getElementById("demographic-table-radial").style.display = "block";
    document.getElementById("demographic-table-recruitment").style.display = "none";
    document.getElementById("demographic-table").style.display = "none";
    if (!accumulatedData) {
        accumulatedData = {
            population: 0,
            median_income: 0
        };
    }
    accumulatedData.population += parseInt(data.population) || 0;
    accumulatedData.median_income += parseInt(data.median_income) || 0;
    document.querySelector("#demographicTableRadial tbody").rows[0].cells[1].textContent = data.population || 0;
    document.querySelector("#demographicTableRadial tbody").rows[1].cells[1].textContent = data.median_income || 0;
}
async function fetchPopulationData(center, radius) {
    try {
        if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
            console.error("Invalid center coordinates:", center);
            throw new Error("Invalid center coordinates");
        }
        if (center.lat < -90 || center.lat > 90) {
            console.error("Latitude out of range:", center.lat);
            throw new Error("Latitude must be between -90 and 90");
        }
        if (center.lng < -180 || center.lng > 180) {
            console.error("Longitude out of range:", center.lng);
            throw new Error("Longitude must be between -180 and 180");
        }
        const location = `${center.lat},${center.lng}`;
        const apiUrl = `/fetch_population?center=${location}&radius=${radius}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API response error:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        if (result.success) {
            return {
                population: result.data.population || 0,
                median_income: parseFloat(result.data.median_income || 0).toFixed(2)
            };
        } else {
            console.error("Error fetching population data:", result.error);
            return { population: 0, median_income: 0 };
        }
    } catch (error) {
        console.error("Error fetching population data:", error);
        return { population: 0, median_income: 0 };
    }
}

async function fetchDataByPostalCode(postalCode, isFirstZipCode = false, populationValue = null) {
    const loaderWrapper = document.getElementById('loader-wrapper');    
    try {
        if (loaderWrapper) {
            loaderWrapper.style.display = 'block';
        }
        const response = await fetch(`/get_data?zip_code=${postalCode}`);
        if (!response.ok) {
            console.warn(`HTTP error for ZIP code ${postalCode}! Status: ${response.status}`);
            return null;
        }
        const result = await response.json();
        if (!result.success) {
            console.warn(`No data found for ZIP code ${postalCode}: ${result.error}`);
            return null;
        }
        const processedData = {...result.data};

        console.log(`Processing postal code: ${postalCode}`);
        console.log(`Population value: ${populationValue}`);
        console.log(`Is first ZIP code: ${isFirstZipCode}`);

        if (populationValue !== null) {
            processedData.population = populationValue;
        }
        if (activeCircle && activeCircleId) {
            const circleData = circles.get(activeCircleId);
            if (circleData) {
                circleData.data.demographics = { ...accumulatedData };
                circles.set(activeCircleId, circleData);
            }
        }
        return processedData;
    } catch (error) {
        console.warn(`Error processing ZIP code ${postalCode}:`, error);
        return null;
    } finally {
        if (loaderWrapper) {
            loaderWrapper.style.display = 'none';
        }
    }
}
async function getPostalCodeFromPlaceId(placeId) {
    const service = new google.maps.places.PlacesService(map);
    return new Promise((resolve, reject) => {
        const request = {
            placeId: placeId
        };
        service.getDetails(request, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let postalCode = '';
                if (place.address_components) {
                    place.address_components.forEach(component => {
                        if (component.types.includes('postal_code')) {
                            postalCode = component.long_name;
                        }
                    });
                }
                resolve(postalCode);
            } else {
                reject(new Error(`Failed to get details for placeId: ${placeId}, Status: ${status}`));
            }
        });
    });
}

async function getPlacesInCircle(center, radius) {
    const loaderWrapper = document.getElementById('loader-wrapper');
    if (loaderWrapper) {
        loaderWrapper.style.display = 'block'; 
    }
    let populationData = null;
    let populationAdded = false; 
    try {
        populationData = await fetchPopulationData(center, radius);
        if (populationData) {
            RadialpopulateTable(populationData); 
            console.log("Updated accumulatedData with new population and income.");
        }
    } catch (error) {
        console.error("Error fetching population from API:", error);
    }

    const location = `${center.lat},${center.lng}`;
    const url = `http://localhost:5000/nearbysearch?location=${location}&radius=${radius}&type=post_office`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const postalCodesSet = new Set();
        await Promise.all(
            data.results.map(async (place) => {
                const postalCode = await getPostalCodeFromPlaceId(place.place_id);
                if (postalCode) {
                    postalCodesSet.add(postalCode);
                }
            })
        );
        const uniquePostalCodes = Array.from(postalCodesSet);
        const processingResults = [];
        await Promise.all(
            uniquePostalCodes.map(async (postalCode, index) => {
                try {
                    const populationToUse = !populationAdded ? populationData : null;
                    const result = await fetchDataByPostalCode(postalCode, !populationAdded, populationToUse);
                    if (result) {
                        add_state_raial(postalCode);
                        processingResults.push(postalCode);
                        
                        if (!populationAdded) {
                            populationAdded = true;
                        }
                    } else {
                        console.warn(`Skipping postal code ${postalCode} due to missing data`);
                    }
                } catch (error) {
                    console.warn(`Error processing postal code ${postalCode}:`, error);
                }
            })
        );

        if (loaderWrapper) {
            loaderWrapper.style.display = 'none';
        }
        return processingResults; 
    } catch (error) {
        console.error("Error fetching nearby places:", error);
        if (loaderWrapper) {
            loaderWrapper.style.display = 'none';
        }
        return []; 
    }
}


async function createCircleAtSelectedLocation() {
    resetDemographicTable(); 
    isCircleSaved = false; 
    if (selectedLocation) {
        if (currentMarker) {
            currentMarker.setMap(null);
            currentMarker = null;
        }
        map.setCenter(selectedLocation);
        map.setZoom(9);
        const newCircleId = Date.now().toString();
        activeCircleId = newCircleId;
        const newCircle = new google.maps.Circle({
            map: map,
            center: selectedLocation,
            radius: 4828.03,
            fillColor: "#808080",
            fillOpacity: 0.2,
            strokeColor: "#808080",
            strokeOpacity: 0.5,
            strokeWeight: 2,
            id: newCircleId,
        });
        try {
            const data = await fetchPopulationData(selectedLocation, 4828.03);
            console.log("Fetched data for selected location:", data);
            RadialpopulateTable(data);
        } catch (error) {
            console.error(`Error fetching population data for circle ${newCircleId}:`, error);
        }
        let placesInCircle = [];
        try {
            placesInCircle = await getPlacesInCircle(selectedLocation, 4828.03);
            console.log("Places fetched in circle:", placesInCircle);
        } catch (error) {
            console.error(`Error fetching places for circle ${newCircleId}:`, error);
        }
        const circleDataToSet = {
            circle: newCircle,
            label: null,
            data: {
                name: "",
                color: "#808080",
                radius: 4828.03,
                places: placesInCircle,
                demographics: {},
            },
        };
        circles.set(newCircleId, circleDataToSet);
        activeCircle = newCircle;
        const mapClickListener = map.addListener("click", () => {
            if (!isCircleSaved) {
                console.log("Circle not saved. Removing circle and clearing data...");
                newCircle.setMap(null);
                circles.delete(newCircleId);
                activeCircle = null;
                activeCircleId = null;
                resetDemographicTable(); 
                google.maps.event.removeListener(mapClickListener);
                document.getElementById("ActionBtnRadial").style.display = "block";
                document.getElementById("CloseBtnRadial").style.display = "block";
            }
        });
        newCircle.addListener("click", () => {
            activeCircle = newCircle;
            activeCircleId = newCircleId;
            showInputPanel();
        });
        document.getElementById("ActionBtnRadial").style.display = "none";
        document.getElementById("CloseBtnRadial").style.display = "none";
        showInputPanel();
    }
}

function showAddressNameOverRadialTable(){
    const inputAddress = document.getElementById('autocomplete');
    const franchiseDisplay = document.getElementById('franchise-display');

    // Add autocomplete input value to franchise name
    const addressValue = inputAddress.value.trim();
        // Show above-table value
        franchiseDisplay.textContent = `Address: ${addressValue}`;
        franchiseDisplay.style.display = 'block';
    }


function showInputPanel() {
    const panel = document.getElementById("demographic-table-radial");
    if (panel) {
        panel.style.display = "block";
        showAddressNameOverRadialTable();
        document.getElementById("demographic-table-recruitment").style.display = "none";
        document.getElementById("demographic-table").style.display = "none";
        const nameInput = document.getElementById("area-name-radial");
        const radiusInput = document.getElementById("typeNumber");
        if (nameInput && radiusInput) {
            nameInput.value = '';
            radiusInput.value = (circles.get(activeCircle.id).data.radius / 1609.34).toFixed(2);
        }
        document.querySelectorAll('.color-option').forEach(opt =>
            opt.classList.remove('selected')
        );
    }
}
function renderPieChartRadial() {
    const circlesData = Array.from(circles.values());
    const colorCounts = new Map();
    const colorNames = new Map();
    circlesData.forEach(circleData => {
        const color = circleData.data.color || '#99a3a4';
        const name = circleData.data.name || 'Unnamed';
        if (colorCounts.has(color)) {
            colorCounts.set(color, colorCounts.get(color) + 1);
        } else {
            colorCounts.set(color, 1);
            colorNames.set(color, name);
        }
    });
    const chartData = Array.from(colorCounts.entries()).map(([color, count]) => ({
        color: color,
        name: colorNames.get(color),
        count: count
    }));
    const layerInfoView = document.getElementById('layerInfoViewRadial');
    const existingCanvas = layerInfoView.querySelector('canvas');
    const existingRecords = layerInfoView.querySelector('.records-count');
    const existingLegend = layerInfoView.querySelector('.classification-legend');
    if (existingCanvas) existingCanvas.remove();
    if (existingRecords) existingRecords.remove();
    if (existingLegend) existingLegend.remove();
    const totalCircles = circlesData.length;
    const recordsDiv = document.createElement('div');
    recordsDiv.className = 'records-count';
    recordsDiv.textContent = `Total Circles: ${totalCircles}`;
    layerInfoView.appendChild(recordsDiv);
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'circlesPieChartRadial';
    layerInfoView.appendChild(chartCanvas);
    const chartLabels = chartData.map(item => item.name);
    const chartValues = chartData.map(item => item.count);
    const chartColors = chartData.map(item => item.color);
    new Chart(chartCanvas, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartValues,
                backgroundColor: chartColors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = ((value / totalCircles) * 100).toFixed(1);
                            return `${label}: ${value} circles (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    const legendDiv = document.createElement('div');
    legendDiv.className = 'classification-legend';
    legendDiv.style.marginTop = '20px';
    chartData.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.marginBottom = '8px';
        const colorBox = document.createElement('span');
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.backgroundColor = item.color;
        colorBox.style.display = 'inline-block';
        colorBox.style.marginRight = '8px';
        const text = document.createElement('span');
        const percentage = ((item.count / totalCircles) * 100).toFixed(1);
        text.textContent = `${item.name}: ${item.count} circles (${percentage}%)`;
        legendItem.appendChild(colorBox);
        legendItem.appendChild(text);
        legendDiv.appendChild(legendItem);
    });
    layerInfoView.appendChild(legendDiv);
}
function deleteCircleFromTable(circleId) {
    $.ajax({
        url: `/delete_circle/${circleId}`,
        method: "DELETE",
        success: function(response) {
            if (response.status === 'success') {
                // Remove the circle from map
                const circleData = circles.get(circleId);
                if (circleData) {
                    if (circleData.circle) {
                        circleData.circle.setMap(null);  
                    }
                    if (circleData.label) {
                        circleData.label.setMap(null);  
                    }
                }

                // Remove from circles Map
                circles.delete(circleId);

                // Remove row from table
                const tableBody = document.querySelector("#dataTableRadial tbody");
                const rows = tableBody.querySelectorAll("tr");
                rows.forEach(row => {
                    const idCell = row.querySelector("td:nth-child(2)");
                    if (idCell && idCell.textContent === String(circleId)) {
                        tableBody.removeChild(row);
                    }
                });

                // Hide modal and related UI
                $('#delet-area').modal('hide');
                document.getElementById("demographic-table-radial").style.display = "none";
                document.getElementById("RadialViewRight").style.display = "none";
            } else {
                console.error("Error deleting circle:", response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error("AJAX error while deleting circle:", status, error);
        },
        complete: function() {
            console.log("Circle deletion process completed.");
        }
    });
}

function populateTableRadial() {
    const tableBody = document.querySelector("#dataTableRadial tbody");
    const filterRow = tableBody.querySelector("tr:first-child");
    tableBody.innerHTML = "";
    if (filterRow) {
        tableBody.appendChild(filterRow);
    }
    const savedCircles = Array.from(circles.values());
    console.log(savedCircles);
    savedCircles.forEach(circleData => {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.textContent = circleData.data.name;
        row.appendChild(nameCell);
        const idCell = document.createElement("td");
        idCell.textContent = circleData.circle.id;
        row.appendChild(idCell);
        const classificationCell = document.createElement("td");
        classificationCell.textContent = circleData.data.classificationText || '';
        classificationCell.style.backgroundColor = circleData.data.color;
        classificationCell.style.color = "white";
        row.appendChild(classificationCell);
        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-sm btn-danger";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
            deleteCircleFromTable(circleData.circle.id);
        });
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);
        tableBody.appendChild(row);
    });
}

function exportToCSVRadial() {
    const savedCircles = Array.from(circles.values());
    let csvContent = "Name,Latitude,Longitude,Radius (meters),Color\n";
    savedCircles.forEach(circleData => {
        const center = circleData.circle.getCenter();
        const row = [
            `"${circleData.data.name.replace(/"/g, '""')}"`,
            center.lat(),
            center.lng(),
            circleData.circle.getRadius(),
            circleData.data.color
        ].join(',');

        csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const date = new Date();
    const fileName = `radial_analysis_${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}.csv`;
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
function returnToMapRadial() {
    document.getElementById("tableViewRadial").style.display = "none";
    document.getElementById("map-container").style.display = "block";
}
function initializeColorOptionsRadial() {
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.getAttribute('data-color');
        let rgbValues;
        if (color === 'white') {
            rgbValues = '255,255,255';
        } else {
            rgbValues = color.match(/\d+,\d+,\d+/)?.[0] || '128,128,128';
        }
        option.style.setProperty('--hover-color', rgbValues);
        option.removeEventListener('click', handleColorOptionClickRadial);
        option.addEventListener('click', handleColorOptionClickRadial);
    });
}
function initializeColorOptionsClick() {
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', handleColorOptionClickRadial);
    });
}
function handleColorOptionClickRadial(e) {
    const colorOption = e.target.closest('.color-option');
    if (!colorOption) return;
    document.querySelectorAll('.color-option').forEach(opt =>
        opt.classList.remove('selected')
    );
    colorOption.classList.add('selected');
    selectedColor = colorOption.dataset.color;
}
function handleSubmitRadial() {
    newSelectedRegionsRadial = Array.from(selectedRegionsRadial.values()).filter(region => region.groupId === null);
    if (newSelectedRegionsRadial.length > 0) {
        document.getElementById("input-area-radial").style.display = "block";
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.color-option[data-color="white"]')?.classList.add('selected');
        selectedColorRadial = document.querySelector('.color-option[data-color="white"]')?.dataset.color || 'white';
    } else {
        console.log("No new regions selected. Please click on one or more regions before submitting.");
    }
}
function hide_demographic_tableRadial() {
    var table = document.getElementById('demographic-table-radial');
        if (table.style.display === 'block') {
            table.style.display = 'none';
            var toggleButton = document.getElementById('toggle-demographic-btn');
            toggleButton.textContent = 'Show Demographic Data';
        }
}
function handleSaveRadial() {
    if (!activeCircle) {
        return;
    }
    const name = document.getElementById("area-name-radial").value.trim();
    if (!name) {
        alert("Please enter a name for the selected area.");
        return;
    }
    const selectedColorOption = document.querySelector('.color-option.selected');
    if (!selectedColorOption) {
        alert("Please select a color for the area.");
        return;
    }
    const color = selectedColorOption.dataset.color;
    const demographicData = {
        population: document.querySelector("#demographicTableRadial tbody").rows[0].cells[1].textContent,
        median_income: document.querySelector("#demographicTableRadial tbody").rows[1].cells[1].textContent,
    };
    const franchiseeNumber = document.getElementById("franchise-number-radial").value.trim();
    const city = document.getElementById("city-radial").value.trim();
    const state = document.getElementById("state-radial").value.trim();
    const address = document.getElementById("address-radial").value.trim();

    activeCircle.setOptions({
        fillColor: color,
        strokeColor: color
    });
    const circleData = circles.get(activeCircle.id);
    if (circleData && circleData.label) {
        circleData.label.setMap(null);
    }
    const label = new google.maps.Marker({
        position: activeCircle.getCenter(),
        map: map,
        label: {
            text: name,
            color: 'black',
            fontWeight: "700",
            fontSize: "14px",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0
        }
    });
    circles.set(activeCircle.id, {
        circle: activeCircle,
        label: label,
        data: {
            name: name,
            color: color,
            franchiseeNumber: franchiseeNumber,
            city: city,
            state: state,
            address: address,
            demographics: demographicData,
            places: circleData.data.places || []
        }

    });
    saveCirclesToLocalStorage()
        .then(() => {
            document.getElementById("demographic-table-radial").style.display = "block";
            document.getElementById("input-area-radial").style.display = "none";
            renderPieChartRadial();
            setTimeout(() => {
                document.getElementById("autocomplete").value = '';
                document.getElementById("area-name-radial").value = '';
                document.getElementById("franchise-number-radial").value = '';
                document.getElementById("address-radial").value = '';
                document.getElementById("city-radial").value = '';
                document.getElementById("state-radial").value = '';
                const selectedColor = document.querySelector('.color-option.selected');
                if (selectedColor) {
                    selectedColor.classList.remove('selected');
                }
                accumulatedData = {
                    population: 0,
                    median_income: 0,
                };
                // activeCircle = null;
            }, 2000);
            location.reload();
        })
        .catch(error => {
            console.error("Error in save process:", error);
        });
        isCircleSaved = true;
}
function saveCirclesToLocalStorage() {
    return new Promise((resolve, reject) => {
        autocompleteInput = document.getElementById("autocomplete").value || '';

        if (!activeCircleId || !circles.has(activeCircleId)) {
            reject("No active circle selected");
            return;
        }

        const value = circles.get(activeCircleId);
        const circle = value.circle;
        const circleData = {
            [activeCircleId]: {
                id: activeCircleId,
                name: value.data.name || '',
                color: value.data.color,
                classificationText: value.data.classificationText || 'Unclassified',
                center: {
                    lat: circle.getCenter().lat(),
                    lng: circle.getCenter().lng()
                },
                radius: circle.getRadius(),
                franchiseeNumber: value.data.franchiseeNumber || '',
                city: value.data.city || '',
                state: value.data.state || '',
                address: value.data.address || '',
                demographics: value.data.demographics || null,
                places: value.data.places || [],
                autocomplete_value: autocompleteInput
            }
        };

         $.ajax({
            url: "/save_circles",
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(circleData),
            success: function(response) {
                if (response.status === "success") {
                    console.log("Success");
                    resolve();
                } else {
                    console.log("Error saving circle data:", response.message);
                    document.getElementById("demographic-table-radial").style.display = "block";
                    // showAddressNameOverRadialTable();
                    document.getElementById('franchise-display').textContent = `Franchise Area: ${circleData[activeCircleId].name}`;
                    document.getElementById("ActionBtnRadial").style.display = "block";
                    document.getElementById("CloseBtnRadial").style.display = "block";
                    document.getElementById("submit-btn-radial").style.display = "none";
                    document.getElementById("input-area-radial").style.display = "none";
                    document.getElementById("autocomplete").value = '';
                    autocompleteInput = '';
                    document.getElementById("area-name-radial").value = '';
                    document.getElementById("franchise-number-radial").value = '';
                    document.getElementById("address-radial").value = '';
                    document.getElementById("city-radial").value = '';
                    document.getElementById("state-radial").value = '';
                    const selectedColor = document.querySelector('.color-option.selected');
                    if (selectedColor) {
                        selectedColor.classList.remove('selected');
                    }
                    accumulatedData = {
                        population: 0,
                        median_income: 0,
                    };
                    // activeCircle = null;
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX error:", status, error);
                console.error("XHR status:", xhr.status);
            }
        });
        document.getElementById("autocomplete").value = '';
    });
}

function initializeEventListenersRadial() {
    document.getElementById('submit-btnRadial')?.addEventListener('click', function() {
        handleSubmitRadial();
        hide_demographic_tableRadial();
    });
    document.getElementById("save-btn-radial")?.addEventListener("click", handleSaveRadial);
    document.querySelectorAll('.action-btn').forEach(button => {
        if (button.textContent.trim() === 'Edit label content') {
            button.addEventListener('click', () => {
                $('#editLabelModal').modal('show');
            });
        }
    });
    // document.getElementById('saveLabelChanges').addEventListener('click', function() {
    //     prefixRadial = document.getElementById('prefixInput').value.trim();
    //     $('#editLabelModal').modal('hide');
    //     updateLabelsRadial();
    // });
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.getAttribute('data-color');
        let rgbValues;
        if (color === 'white') {
            rgbValues = '255,255,255';
        } else {
            rgbValues = color.match(/\d+,\d+,\d+/)?.[0] || '128,128,128';
        }
        option.style.setProperty('--hover-color', rgbValues);
        option.addEventListener('click', function(e) {
            document.querySelectorAll('.color-option').forEach(opt =>
                opt.classList.remove('selected')
            );
            this.classList.add('selected');
            selectedColorRadial = this.dataset.color;
        });
    });
}
function handleDynamicRadiusChange(event) {
    const newRadiusInMiles = parseFloat(event.target.value);
    if (isNaN(newRadiusInMiles) || newRadiusInMiles < 1) {
        return; 
    }
    const newRadiusInMeters = newRadiusInMiles * 1609.34;
    if (!activeCircle || !activeCircleId) {
        alert("Please select a circle to edit first");
        return;
    }
    if (originalRadius === null) {
        originalRadius = activeCircle.getRadius();
    }
    updateUIElements(newRadiusInMeters);
    hasUnsavedChanges = true;
    updateSaveButtonState();
}
async function updateUIElements(newRadius) {
    if (!activeCircle || !activeCircleId) return;
    activeCircle.setRadius(newRadius);
    resetAccumulatedData();
    const centerLatLng = activeCircle.getCenter();
        const center = {
            lat: centerLatLng.lat(),
            lng: centerLatLng.lng()
        };
    const placesInCircle = await getPlacesInCircle(center, newRadius);
    const circleData = circles.get(activeCircleId);
    if (circleData) {
        circleData.circle = activeCircle;
        circleData.data = {
            ...circleData.data,
            radius: newRadius,
            places: placesInCircle,
            demographics: { ...accumulatedData }
        };
        if (accumulatedData) {
            renderPieChartRadial();
        }
    }
}
function updateSaveButtonState() {
    const saveButton = document.getElementById('saveBtnForRadius');
    if (saveButton) {
        saveButton.disabled = !hasUnsavedChanges;
        saveButton.classList.toggle('btn-warning', hasUnsavedChanges);
        saveButton.textContent = hasUnsavedChanges ? 'Save Changes' : 'Save';
    }
}
function resetAccumulatedData() {
    accumulatedData = null;
}
async function handleRadiusChange(newRadius) {
    if (!activeCircle || !activeCircleId) {
        alert("Please select a circle to edit first");
        return;
    }
    const saveButton = document.getElementById('saveBtnForRadius');
    saveButton.disabled = true;
    saveButton.textContent = 'Updating...';
    try {
        const centerLatLng = activeCircle.getCenter();
        const center = {
            lat: centerLatLng.lat(),
            lng: centerLatLng.lng()
        };
        activeCircle.setRadius(newRadius);
        resetAccumulatedData();
        const placesInCircle = await getPlacesInCircle(center, newRadius);
        const circleData = circles.get(activeCircleId);
        const colorToSave = selectedColor || circleData.data.color;
        if (circleData) {
            circleData.circle = activeCircle;
            circleData.data = {
                ...circleData.data,
                radius: newRadius,
                places: placesInCircle,
                demographics: { ...accumulatedData }  
            };
            console.log("Accumulated data ", circleData.data)
            circles.set(activeCircleId, circleData);
            const updatedCircleData = {
                id: activeCircleId,
                name: circleData.data.name || '',
                color: colorToSave,
                classificationText: circleData.data.classificationText || 'Unclassified',
                center: center,
                radius: newRadius,
                franchiseeNumber: circleData.data.franchiseeNumber || '',
                city: circleData.data.city || '',
                state: circleData.data.state || '',
                demographics: circleData.data.demographics || {},  
                places: circleData.data.places || []
            };
            const response = await fetch(`/update_circle/${activeCircleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCircleData)
            });
            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error('Failed to update circle data');
            }
            if (selectedColor) {
                activeCircle.setOptions({
                    fillColor: selectedColor,
                    strokeColor: selectedColor
                });
            }
            // if (accumulatedData) {
            //     renderPieChartRadial(); 
            // }
        }
    } catch (error) {
        console.error('Error updating circle:', error);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
    }
}
function clearMapCircles() {
    circles.forEach((value, key) => {
        value.circle.setMap(null);
        value.label.setMap(null);
    });
    circles.clear();
    activeCircle = null;
    activeCircleId = null;
}
function toggleClassificationColorsRadial(button) {
    areColorsVisibleRadial = !areColorsVisibleRadial;
    featureLayer.style = applyStyleRadial;
    button.textContent = areColorsVisibleRadial ? "Hide classification colours" : "Show classification colours";
}
function applyStyleRadial(params) {
    if (!areColorsVisibleRadial) {
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 2.0,
            fillColor: "#FFFFFF",
            fillOpacity: 0.1,
        };
    }
    const placeId = params.feature.placeId;
    const region = selectedRegionsRadial.get(placeId);

    if (isEditingAreaRadial) {
        if (region && region.groupId === editingGroupIdRadial) {
            return {
                strokeColor: "#000000",
                strokeOpacity: 1.0,
                strokeWeight: 2.0,
                fillColor: selectedColorRadial || 'grey',
                fillOpacity: 0.5
            };
        }
        if (newSelectedRegionsRadial.some(r => r.placeId === placeId)) {
            return {
                strokeColor: "#000000",
                strokeOpacity: 1.0,
                strokeWeight: 2.0,
                fillColor: selectedColorRadial || 'grey',
                fillOpacity: 0.5
            };
        }
    } else if (region) {
        if (region.groupId !== null) {
            const group = selectedRegionGroupsRadial.get(region.groupId);
            if (selectedGroupForDeletionRadial === region.groupId) {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: region.color || 'grey',
                    fillOpacity: 0.2
                };
            } else {
                return {
                    strokeColor: "#000000",
                    strokeOpacity: 1.0,
                    strokeWeight: 2.0,
                    fillColor: region.color || 'grey',
                    fillOpacity: 0.5
                };
            }
        } else {
            return {
                strokeColor: "#000000",
                strokeOpacity: 1.0,
                strokeWeight: 2.0,
                fillColor: "#99a3a4",
                fillOpacity: 0.5
            };
        }
    }
    if (lastInteractedFeatureIds.includes(placeId)) {
        return styleMouseMove;
    }
    return styleDefault;
}
function updateLabelsRadial() {
    overlaysRadial.forEach(overlay => overlay.setMap(null));
    labelsRadial.forEach(label => label.setMap(null));
    overlaysRadial = [];
    labelsRadial = [];
    if (selectedRegionGroupsRadial.size > 0) {
        selectedRegionGroupsRadial.forEach((group, groupId) => {
            if (group.regions.length > 0) {
                const firstRegion = selectedRegionsRadial.get(group.regions[0]);
                if (firstRegion) {
                    const labelText = prefixRadial ? `${prefixRadial} ${group.name}` : group.name;
                    const label = new google.maps.Marker({
                        position: { lat: firstRegion.lat, lng: firstRegion.lng },
                        map: map,
                        label: {
                            text: labelText,
                            color: 'black',
                            fontWeight: "700",
                            fontSize: "14px",
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                            className: 'map-label'
                        },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 0,
                        }
                    });
                    labelsRadial.push(label);
                }
            }
        });
    }
}
