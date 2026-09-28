# Colombo Municipal Road Corridors & Contractor Fleet Optimization Specs

> **Scope**: Dispatch and Route Priority Clustering Agent  
> **Geographic Boundaries**: Colombo Municipal Council (CMC) District 1 through 5, Greater Colombo Urban Corridors

---

## 1. Key Colombo Arterial Maintenance Corridors

### Corridor 1: Galle Road (A2 Arterial Corridor)
- **Extents**: Fort (Colombo 01) through Galle Face, Kollupitiya (Colombo 03), Bambalapitiya (Colombo 04), Wellawatte (Colombo 06) to Dehiwala Bridge.
- **Characteristics**: Extremely high commuter bus traffic and commercial activity. High priority arterial route.
- **Dispatch Rule**: Cluster potholes or utility bursts within 2.5 km into a single night or morning low-traffic window (22:00–05:00 or 10:00–15:00).
- **Primary Specialization**: Asphalt Roadworks, Traffic Management, Potable Water Main Fast-Response.

### Corridor 2: Baseline Road (A1 / B214 North-South Corridor)
- **Extents**: Peliyagoda Bridge through Grandpass (Colombo 14), Orugodawatta, Dematagoda (Colombo 09), Borella (Colombo 08) to Kirulapone (Colombo 05).
- **Characteristics**: Major dual carriageway freight corridor connecting Port of Colombo to Southern Expressway. Heavy multi-axle container trailer traffic.
- **Dispatch Rule**: High impact for road depression. Equipment requires heavy-duty roller (8–10 ton) and deep ABC base compaction.
- **Primary Specialization**: Heavy Civil & Highway Engineering, Industrial Drainage.

### Corridor 3: High Level Road (A4 South-Eastern Corridor)
- **Extents**: Tunmulla Junction (Colombo 07) through Havelock Town, Kirulapone (Colombo 05), Nugegoda boundary.
- **Characteristics**: Severe rush-hour congestion, narrow roadside verges, aging British-era water siphon mains.
- **Dispatch Rule**: Co-locate drainage cleaning and pipe leak teams into sequential traversals to avoid multiple lane closures.
- **Primary Specialization**: Water & Plumbing, Road Surface Rehabilitation.

### Corridor 4: Central Commercial District (Pettah / Fort / Kochchikade)
- **Extents**: Colombo 01, Colombo 11, Colombo 13.
- **Characteristics**: Narrow colonial roads, massive pedestrian density, heavy wholesale commerce, high sewer and drainage siltation.
- **Dispatch Rule**: Require compact machinery (mini-excavator, baby gully bowser). Maximum transit distance between clustered jobs should be < 1.0 km.
- **Primary Specialization**: Drainage Jetting, Pavement Paver Repair, Emergency Electrical.

---

## 2. Contractor Specialization & Fleet Matching Heuristics

1. **Roads & Asphalt Specialist**:
   - Required Equipment: Asphalt cutter, baby roller, bitumen tack sprayer, asphalt tipper truck.
   - Recommended Crew: 3–4 workers.
   - Target Hazards: Potholes, road depressions, shoulder collapses, speed breaker restorations.

2. **Drainage & Canal Solutions**:
   - Required Equipment: Vacuum gully bowser, high-pressure jetting unit, submersible mud pump, mini-digger.
   - Recommended Crew: 4–6 workers.
   - Target Hazards: Silted storm drains, flooded culverts, overflowing manholes, blocked canal grills.

3. **Water Supply & Pipeworks Specialist**:
   - Required Equipment: Pipe trench cutter, de-watering pump, electrofusion welder, ductile iron mechanical sleeves.
   - Recommended Crew: 3–4 certified utility fitters.
   - Target Hazards: Pressurized water leaks, ruptured rider mains, ferrule disconnections.

4. **Electrical & Municipal Power Utility**:
   - Required Equipment: Bucket boom truck, 1000V insulation testing kit, portable generator.
   - Recommended Crew: 2–3 certified electrical linesmen.
   - Target Hazards: Defective streetlights, fallen cables, knocked-over poles, traffic signal failure.

---

## 3. Urgency vs. Distance Clustering Heuristics

- **Cluster Radius**:
  - Dense Urban (Pettah/Fort): 800m to 1.2 km.
  - Linear Arterials (Galle Rd / Baseline Rd): Up to 3.5 km along the same corridor direction.
- **Sequential Routing**:
  - Traversal order MUST prioritize **CRITICAL** hazards first regardless of position if within SLA window, followed by upstream-to-downstream transit to eliminate backtracking.
- **Transit Time Benchmark**:
  - Average urban speed during off-peak: 20 km/h (~3 minutes per kilometer).
  - Grouping 3 proximate hazards into one route saves an estimated 35–50 minutes of transit overhead.
