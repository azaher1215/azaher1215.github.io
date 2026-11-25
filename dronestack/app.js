/* =========================================================
   dronestack — Customizable Navigation Stack for Spot & Jackal
   ---------------------------------------------------------
   STACKS[]      — comparison-table rows + Mermaid graphs.
   REFERENCES[]  — bibliography rendered in §References.
   PROJECT_CITATION — BibTeX / APA for this repository.

   Mermaid topic-node convention:
     [/"topic_name (MsgType)"/]:::topic
   Quoted to allow leading and embedded "/" in ROS topics.
   ========================================================= */

const STACKS = [
  /* ---------------- JACKAL (Jazzy) ---------------- */
  {
    id: "J-01",
    robot: "Jackal",
    distro: "Jazzy",
    name: "LiDAR · slam_toolbox · Nav2",
    sensors: "Real: Ouster OS-1-128 via ouster_ros sensor.launch.xml (lidar_mode 512x10) → j100_0000/ouster/points · Sim: Clearpath Gazebo (clearpath_gz/simulation.launch.py)",
    slam: "slam_toolbox · async_slam_toolbox_node as a LifecycleNode under namespace j100_0000 (configure + activate driven by RegisterEventHandler).",
    localization: "slam_toolbox online pose graph. Publishes map→odom TF and /map.",
    map: "2D occupancy grid on /map (slam_toolbox).",
    planner: "Nav2 · DWBLocalPlanner controller + NavfnPlanner global, all under j100_0000 namespace.",
    odomTopic: "j100_0000/platform/odom/filtered (from Clearpath J100 driver) — read by bt_navigator.odom_topic and velocity_smoother.odom_topic via the launch's odom_topic arg substituted into clearpath_nav2_params.yaml.",
    tfChain: "map→odom: slam_toolbox · odom→base_link: Clearpath J100 driver (real) / Clearpath Gazebo (sim) · base_link→sensor_frames: extra_state_publisher loads robot_extras.urdf.xacro (real-robot only). tf_relay + tf_static_relay republish /tf and /tf_static into the j100_0000 namespace on the real robot.",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid) · local_costmap.voxel_layer → j100_0000/ouster/points (PointCloud2 — raw lidar, NOT a LaserScan) · bt_navigator + velocity_smoother → j100_0000/platform/odom/filtered. Note: pointcloud_to_laserscan is defined in the launch file but is COMMENTED OUT of the LaunchDescription — slam_toolbox subscribes to converted_scan, which only exists if the Clearpath sim or another node publishes it.",
    launchFile: "inspector/launch/clearpath_nav2.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d
  classDef warn fill:#fee2e2,stroke:#991b1b,stroke-width:1px,color:#7f1d1d

  subgraph TOPICS["Topic flow (under namespace j100_0000)"]
    direction LR
    L([Ouster OS-1 / Clearpath Gazebo]):::sensor --> T1[/"ouster/points (PointCloud2)"/]:::topic
    J([Clearpath J100 driver]):::sensor --> T2[/"platform/odom/filtered (Odometry)"/]:::topic
    T1 -. "pointcloud_to_laserscan is commented out in the launch" .-> N1[pointcloud_to_laserscan]:::warn
    N1 --> T3[/"converted_scan (LaserScan)"/]:::topic
    T3 --> N2[slam_toolbox · LifecycleNode]:::node
    T2 --> N2
    N2 --> T4[/"/map (OccupancyGrid)"/]:::topic
    T4 --> N3[Nav2 stack]:::node
    T1 --> N3
    T2 -- "bt_navigator.odom_topic" --> N3
    N3 --> T6[/"cmd_vel (Twist)"/]:::topic
    T6 --> J
  end

  subgraph TFCHAIN["TF chain: map -> odom -> base_link"]
    direction LR
    F0["map"]:::tf -- "slam_toolbox" --> F1["odom"]:::tf
    F1 -- "Clearpath J100 driver (real) / Clearpath Gazebo (sim)" --> F2["base_link"]:::tf
    F2 -- "extra_state_publisher (robot_extras.urdf.xacro, real only)" --> F3["sensor frames"]:::tf
  end

  subgraph NAV2["Nav2 subscriptions (clearpath_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"j100_0000/ouster/points (PointCloud2)"/]:::topic --> NN2[local_costmap.voxel_layer]:::nav
    NI3[/"j100_0000/platform/odom/filtered (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "J-02",
    robot: "Jackal",
    distro: "Jazzy",
    name: "LiDAR-Inertial · FAST-LIO + slam_toolbox · Nav2",
    sensors: "Real: Ouster OS-1-128 (lidar_mode 1024x10) → j100_0000/ouster/points + j100_0000/ouster/imu · Sim: Clearpath Gazebo. Clearpath J100 driver also publishes j100_0000/platform/odom/filtered.",
    slam: "FAST-LIO (lidar+imu) → publishes Odometry (camera_init→body) and cloud_registered. dummy_scan_subscriber re-publishes Odometry as /odom (frame_id=odom, child=base_link). slam_toolbox (plain Node, namespaced) subscribes to scan_topic=scan and odom_topic=odom — meaning it consumes FAST-LIO's odom estimate via the dummy node, NOT the J100 wheel odom.",
    localization: "FAST-LIO LIO + slam_toolbox 2D pose-graph. BUG: slam_toolbox publishes map→odom AND map_to_odom_static publishes the same — two publishers compete for the same TF.",
    map: "2D grid on /map (slam_toolbox).",
    planner: "Nav2 · DWBLocalPlanner + NavfnPlanner under j100_0000 namespace.",
    odomTopic: "j100_0000/platform/odom/filtered (Clearpath J100 driver) is what bt_navigator + velocity_smoother read (via launch's odom_topic arg substituted into clearpath_nav2_params.yaml). slam_toolbox itself reads a different /odom topic (FAST-LIO output via dummy_scan_subscriber).",
    tfChain: "Multiple competing publishers: map→odom is published by BOTH slam_toolbox AND a static_transform_publisher · odom→base_link is published by BOTH the J100 driver AND the static-bridged FAST-LIO chain (odom→camera_init→body→base_link). Only one parent wins per child in tf2; the rest is orphaned.",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from slam_toolbox) · local_costmap.voxel_layer → j100_0000/ouster/points (PointCloud2 — raw lidar) · bt_navigator + velocity_smoother → j100_0000/platform/odom/filtered.",
    launchFile: "inspector/launch/clearpath_nav2_fastlio.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d
  classDef warn fill:#fee2e2,stroke:#991b1b,stroke-width:1px,color:#7f1d1d

  subgraph TOPICS["Topic flow (under namespace j100_0000)"]
    direction LR
    L([Ouster OS-1 / Clearpath Gazebo]):::sensor --> T1[/"ouster/points (PointCloud2)"/]:::topic
    L --> T2[/"ouster/imu (Imu)"/]:::topic
    J([Clearpath J100 driver]):::sensor --> T7[/"platform/odom/filtered (Odometry)"/]:::topic
    T1 --> N1[fast_lio · fastlio_mapping]:::node
    T2 --> N1
    N1 --> T3[/"Odometry (Odometry)"/]:::topic
    N1 --> T4[/"cloud_registered (PointCloud2)"/]:::topic
    T1 --> N2[pointcloud_to_laserscan]:::node
    N2 --> T5[/"scan (LaserScan)"/]:::topic
    T3 --> N6[dummy_scan_subscriber · republishes as /odom]:::node
    N6 --> T9[/"/odom (Odometry, re-framed)"/]:::topic
    T5 --> N3[slam_toolbox]:::node
    T9 --> N3
    N3 --> T6[/"/map (OccupancyGrid)"/]:::topic
    T6 --> N4[Nav2 stack]:::node
    T1 --> N4
    T7 -- "bt_navigator.odom_topic" --> N4
    N4 --> T8[/"cmd_vel (Twist)"/]:::topic
    T8 --> J
  end

  subgraph TFCHAIN["TF chain — competing publishers (real bug)"]
    direction LR
    F0["map"]:::tf -- "slam_toolbox  +  static identity (CONFLICT)" --> F1["odom"]:::tf
    F1 -- "J100 driver (used by Nav2)" --> F2["base_link"]:::tf
    F1 -. "static identity" .-> F3["camera_init"]:::tf
    F3 -. "FAST-LIO (camera_init->body)" .-> F4["body"]:::tf
    F4 -. "static identity (CONFLICT with J100)" .-> F2
    BUG["Two publishers for map->odom; two paths to base_link — only one wins per child"]:::warn
  end

  subgraph NAV2["Nav2 subscriptions (clearpath_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"j100_0000/ouster/points (PointCloud2)"/]:::topic --> NN2[local_costmap.voxel_layer]:::nav
    NI3[/"j100_0000/platform/odom/filtered (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "J-03",
    robot: "Jackal",
    distro: "Jazzy",
    name: "LiDAR-Inertial · FAST-LIO + OctoMap · Nav2",
    sensors: "Real: Ouster OS-1-128 (lidar_mode 1024x10) → j100_0000/ouster/points + j100_0000/ouster/imu · Sim: Clearpath Gazebo. Clearpath J100 driver also publishes j100_0000/platform/odom/filtered.",
    slam: "FAST-LIO only (no slam_toolbox in this stack). FAST-LIO publishes Odometry (camera_init→body) and cloud_registered. dummy_scan_subscriber re-publishes Odometry as /odom for downstream consumers.",
    localization: "Open-loop bridging: map→odom is a STATIC identity (no SLAM correction). FAST-LIO's camera_init→body is spliced into the tree via static publishers, but the J100 driver also publishes odom→base_link → conflict.",
    map: "octomap_server2 builds 3D OctoMap from cloud_registered and publishes projected_map → remapped to /map (GLOBAL, not under j100_0000).",
    planner: "Nav2 · DWBLocalPlanner + NavfnPlanner under j100_0000 namespace.",
    odomTopic: "j100_0000/platform/odom/filtered (Clearpath J100 driver) — read by bt_navigator.odom_topic and velocity_smoother.odom_topic via the launch arg substituted into clearpath_nav2_params.yaml.",
    tfChain: "map→odom: static_transform_publisher (identity, no SLAM correction) · odom→base_link: BOTH the J100 driver AND the FAST-LIO bridge chain (odom→camera_init→body→base_link) — competing publishers, only one parent wins. base_link→sensor_frames: extra_state_publisher (real only).",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from octomap_server2, GLOBAL topic) · local_costmap.voxel_layer → j100_0000/ouster/points (PointCloud2 — raw lidar) · bt_navigator + velocity_smoother → j100_0000/platform/odom/filtered.",
    launchFile: "inspector/launch/clearpath_nav2_fastlio_octo.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d
  classDef warn fill:#fee2e2,stroke:#991b1b,stroke-width:1px,color:#7f1d1d

  subgraph TOPICS["Topic flow (under namespace j100_0000)"]
    direction LR
    L([Ouster OS-1 / Clearpath Gazebo]):::sensor --> T1[/"ouster/points (PointCloud2)"/]:::topic
    L --> T2[/"ouster/imu (Imu)"/]:::topic
    J([Clearpath J100 driver]):::sensor --> T3[/"platform/odom/filtered (Odometry)"/]:::topic
    T1 --> N1[fast_lio · fastlio_mapping]:::node
    T2 --> N1
    N1 --> T4[/"Odometry (Odometry)"/]:::topic
    N1 --> T5[/"cloud_registered (PointCloud2)"/]:::topic
    T4 --> N5[dummy_scan_subscriber · republishes as /odom]:::node
    T5 --> N2[octomap_server2]:::node
    N2 --> T6[/"/map (OccupancyGrid, GLOBAL)"/]:::topic
    N2 --> T7[/"octomap_full (octomap_msgs/Octomap)"/]:::topic
    T6 --> N3[Nav2 stack]:::node
    T1 --> N3
    T3 -- "bt_navigator.odom_topic" --> N3
    N3 --> T8[/"cmd_vel (Twist)"/]:::topic
    T8 --> J
  end

  subgraph TFCHAIN["TF chain — STATIC identities + FAST-LIO bridge"]
    direction LR
    F0["map"]:::tf -- "static identity" --> F1["odom"]:::tf
    F1 -- "J100 driver (used by Nav2)" --> F2["base_link"]:::tf
    F1 -. "static identity" .-> F3["camera_init"]:::tf
    F3 -. "FAST-LIO (camera_init->body)" .-> F4["body"]:::tf
    F4 -. "static identity (CONFLICT with J100)" .-> F2
    BUG["base_link has two parents (odom and body); only one wins — FAST-LIO chain is orphaned"]:::warn
  end

  subgraph NAV2["Nav2 subscriptions (clearpath_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"j100_0000/ouster/points (PointCloud2)"/]:::topic --> NN2[local_costmap.voxel_layer]:::nav
    NI3[/"j100_0000/platform/odom/filtered (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },

  /* ---------------- SPOT (Humble) ---------------- */
  {
    id: "S-01",
    robot: "Spot",
    distro: "Humble",
    name: "LiDAR · slam_toolbox · Nav2",
    sensors: "Velodyne Puck (sim: /Spot/Velodyne_Puck/point_cloud) · Ouster OS-1-128 (real: ouster/points + ouster/imu)",
    slam: "slam_toolbox · async_slam_toolbox_node (plain Node, autostart)",
    localization: "slam_toolbox online pose graph (publishes map→odom TF)",
    map: "2D occupancy grid on /map (slam_toolbox)",
    planner: "Nav2 · controller_server + planner_server + bt_navigator (MPPI controller)",
    odomTopic: "/Spot/odometry — read by bt_navigator.odom_topic and velocity_smoother.odom_topic (spot_nav2_params.yaml)",
    tfChain: "map→odom: slam_toolbox · odom→base_link: Webots Spot driver (sim) / Spot ROS 2 driver (real) · base_link→sensor_frames: robot_state_publisher (spot.urdf); real-robot adds extra_sensor_state_publisher (robot_extras.urdf.xacro)",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid) · global_costmap.obstacle_layer + local_costmap.voxel_layer → /scan (LaserScan, from pointcloud_to_laserscan) · bt_navigator + velocity_smoother → /Spot/odometry (Odometry)",
    launchFile: "inspector/launch/spot_nav2_sim.launch.py · spot_nav2_real.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d

  subgraph TOPICS["Topic flow"]
    direction LR
    SR([Webots Spot / Spot driver]):::sensor --> T1[/"/Spot/Velodyne_Puck/point_cloud (PointCloud2)"/]:::topic
    SR --> T2[/"/Spot/odometry (Odometry)"/]:::topic
    T1 --> N1[pointcloud_to_laserscan]:::node
    N1 --> T3[/"/scan (LaserScan)"/]:::topic
    T3 --> N2[slam_toolbox]:::node
    T2 --> N2
    N2 --> T4[/"/map (OccupancyGrid)"/]:::topic
    T4 --> N3[Nav2 stack]:::node
    T3 --> N3
    T2 -- "bt_navigator.odom_topic" --> N3
    N3 --> T6[/"/cmd_vel (Twist)"/]:::topic
    T6 --> SR
  end

  subgraph TFCHAIN["TF chain: map -> odom -> base_link"]
    direction LR
    F0["map"]:::tf -- "slam_toolbox" --> F1["odom"]:::tf
    F1 -- "Spot driver (sim) / Spot ROS 2 driver (real)" --> F2["base_link"]:::tf
    F2 -- "robot_state_publisher (spot.urdf)" --> F3["sensor frames"]:::tf
  end

  subgraph NAV2["Nav2 subscriptions (spot_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"/scan (LaserScan)"/]:::topic --> NN2[obstacle_layer + voxel_layer]:::nav
    NI3[/"/Spot/odometry (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "S-02",
    robot: "Spot",
    distro: "Humble",
    name: "LiDAR-Inertial · FAST-LIO + OctoMap · Nav2",
    sensors: "Velodyne Puck (/Spot/Velodyne_Puck/point_cloud) + Spot IMU (/Spot/imu); Spot driver also publishes /Spot/odometry",
    slam: "FAST-LIO LIO (mapping node). Publishes Odometry and cloud_registered (PointCloud2) only — does not broadcast TF in this launch.",
    localization: "Open-loop: map→odom is a STATIC identity transform (no SLAM correction). FAST-LIO output is republished by dummy_scan_subscriber as /odom (frame_id=odom, child=base_link) but Nav2 uses /Spot/odometry from the Spot driver, not /odom.",
    map: "octomap_server2 builds 3D OctoMap from cloud_registered and publishes projected_map → remapped to /map (RELIABLE + VOLATILE QoS; spot_nav2_params.yaml is rewritten with map_subscribe_transient_local=false to match). map_relay.py exists in the package but is NOT launched here.",
    planner: "Nav2 · controller_server + planner_server + bt_navigator (MPPI controller)",
    odomTopic: "/Spot/odometry — read by bt_navigator.odom_topic and velocity_smoother.odom_topic (spot_nav2_params.yaml). FAST-LIO's own Odometry topic is not consumed by Nav2.",
    tfChain: "map→odom: static_transform_publisher (identity) · odom→base_link: Webots Spot driver. Static bridges odom→camera_init and body→base_link are also published, intended to splice FAST-LIO's camera_init→body into the tree — but this creates two paths to base_link (via odom directly AND via body) and only one parent wins in tf2. Net effect: FAST-LIO odometry is published as a topic but is not used by Nav2's TF lookups.",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from octomap_server2) · obstacle_layer + voxel_layer → /scan (LaserScan) — BUT this launch does NOT run pointcloud_to_laserscan, so /scan is silent and the costmaps receive no live obstacle data. bt_navigator + velocity_smoother → /Spot/odometry.",
    launchFile: "inspector/launch/spot_nav2_fastlio_octo.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d
  classDef warn fill:#fee2e2,stroke:#991b1b,stroke-width:1px,color:#7f1d1d

  subgraph TOPICS["Topic flow"]
    direction LR
    SR([Webots Spot / Spot driver]):::sensor --> T1[/"/Spot/Velodyne_Puck/point_cloud (PointCloud2)"/]:::topic
    SR --> T2[/"/Spot/imu (Imu)"/]:::topic
    SR --> T7[/"/Spot/odometry (Odometry)"/]:::topic
    T1 --> N1[fast_lio · fastlio_mapping]:::node
    T2 --> N1
    N1 --> T3[/"Odometry (Odometry)"/]:::topic
    N1 --> T4[/"cloud_registered (PointCloud2)"/]:::topic
    T3 --> N4[dummy_scan_subscriber · republishes as /odom]:::node
    T4 --> N2[octomap_server2]:::node
    N2 --> T5[/"/map (OccupancyGrid)"/]:::topic
    T5 --> N3[Nav2 stack]:::node
    T7 -- "bt_navigator.odom_topic" --> N3
    N3 --> T6[/"/cmd_vel (Twist)"/]:::topic
    T6 --> SR
    NOSCAN["NO /scan published — pointcloud_to_laserscan is not launched"]:::warn
    NOSCAN -. "/scan input is silent" .-> N3
  end

  subgraph TFCHAIN["TF chain — STATIC IDENTITIES (no SLAM correction)"]
    direction LR
    F0["map"]:::tf -- "static identity" --> F1["odom"]:::tf
    F1 -- "Spot driver — used by Nav2" --> F2["base_link"]:::tf
    F1 -. "static identity" .-> F3["camera_init"]:::tf
    F3 -. "FAST-LIO LIO (camera_init->body)" .-> F4["body"]:::tf
    F4 -. "static identity" .-> F2
    CONFLICT["base_link has two parents — only one wins; FAST-LIO chain is orphaned"]:::warn
  end

  subgraph NAV2["Nav2 subscriptions (spot_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"/scan (LaserScan) — silent in this launch"/]:::warn --> NN2[obstacle_layer + voxel_layer]:::nav
    NI3[/"/Spot/odometry (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "S-03",
    robot: "Spot",
    distro: "Humble",
    name: "Visual · ORB-SLAM3 RGB-D + OctoMap · Nav2",
    sensors: "Spot head RGB-D (/Spot/head_meta_camera/image_color, /Spot/head_meta_range_finder/image) + Velodyne Puck (/Spot/Velodyne_Puck/point_cloud); Spot driver also publishes /Spot/odometry.",
    slam: "ORB-SLAM3 included via external launch (orb_slam3_ros2_wrapper · rgbd.launch.py). Inspector's orb_rgbd_preprocessor pre-processes the RGB-D pair (BGRA→BGR, depth alignment).",
    localization: "Visual pose graph from ORB-SLAM3 wrapper. /map (occupancy) is published by octomap_server2 from the Velodyne cloud, not from VSLAM.",
    map: "octomap_server2 builds 3D OctoMap from Velodyne PointCloud2 (cloud_in remapped to lidar_topic) and publishes projected_map → /map.",
    planner: "Nav2 · controller_server + planner_server + bt_navigator (MPPI controller)",
    odomTopic: "/Spot/odometry — read by bt_navigator.odom_topic and velocity_smoother.odom_topic (spot_nav2_params.yaml).",
    tfChain: "map→odom or map→base_link: ORB-SLAM3 wrapper (varies by wrapper config) · odom→base_link: Webots Spot driver · base_link→sensor_frames: robot_state_publisher (spot.urdf).",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from octomap_server2) · obstacle_layer + voxel_layer → /scan (LaserScan from pointcloud_to_laserscan on the Velodyne cloud) · bt_navigator + velocity_smoother → /Spot/odometry.",
    launchFile: "inspector/launch/spot_nav2_sim_orbslam3.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d

  subgraph TOPICS["Topic flow"]
    direction LR
    SR([Webots Spot]):::sensor --> T1[/"/Spot/head_meta_camera/image_color (Image, BGRA)"/]:::topic
    SR --> T2[/"/Spot/head_meta_range_finder/image (Image, 32FC1)"/]:::topic
    SR --> T9[/"/Spot/Velodyne_Puck/point_cloud (PointCloud2)"/]:::topic
    SR --> T10[/"/Spot/odometry (Odometry)"/]:::topic
    T1 --> N1[orb_rgbd_preprocessor]:::node
    T2 --> N1
    N1 --> T3[/"/Spot/orb_rgbd/rgb/image (Image, BGR)"/]:::topic
    N1 --> T4[/"/Spot/orb_rgbd/depth/image (Image, 32FC1)"/]:::topic
    T3 --> N2[ORB-SLAM3 RGB-D wrapper]:::node
    T4 --> N2
    N2 --> T5[/"orb_slam3/pose (PoseStamped)"/]:::topic
    T9 --> N3[octomap_server2]:::node
    T9 --> N5[pointcloud_to_laserscan]:::node
    N5 --> T11[/"/scan (LaserScan)"/]:::topic
    N3 --> T7[/"/map (OccupancyGrid)"/]:::topic
    T7 --> N4[Nav2 stack]:::node
    T11 --> N4
    T10 -- "bt_navigator.odom_topic" --> N4
    N4 --> T8[/"/cmd_vel (Twist)"/]:::topic
    T8 --> SR
  end

  subgraph TFCHAIN["TF chain: map -> odom -> base_link"]
    direction LR
    F0["map"]:::tf -- "ORB-SLAM3 wrapper (map->base_link or map->odom)" --> F1["odom"]:::tf
    F1 -- "Spot driver" --> F2["base_link"]:::tf
    F2 -- "robot_state_publisher (spot.urdf)" --> F3["sensor frames"]:::tf
  end

  subgraph NAV2["Nav2 subscriptions (spot_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"/scan (LaserScan)"/]:::topic --> NN2[obstacle_layer + voxel_layer]:::nav
    NI3[/"/Spot/odometry (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "S-04",
    robot: "Spot",
    distro: "Humble",
    name: "Visual · RTAB-Map RGB-D · Nav2",
    sensors: "Spot head RGB-D (/Spot/head_meta_camera/image_color + camera_info, /Spot/head_meta_range_finder/image) + Spot head IMU (/Spot/head/imu) + Velodyne Puck (/Spot/Velodyne_Puck/point_cloud, feeds pointcloud_to_laserscan only)",
    slam: "rtabmap_slam/rtabmap (single-camera RGB-D mode, frame_id=base_link, approx_sync=True, Reg/Force3DoF=true). RTAB-Map subscribes directly to full-resolution images — no image_proc resize stage in this launch.",
    localization: "RTAB-Map appearance-based loop closure + RGBD/ProximityBySpace. Publishes map→odom TF.",
    map: "RTAB-Map publishes 2D OccupancyGrid via map remap → /map (Grid/CellSize=0.05, Grid/RangeMax=5.0, Grid/3D=true, projected to 2D for Nav2).",
    planner: "Nav2 · controller_server + planner_server + bt_navigator (MPPI controller). Note: spot_nav2_params_rtabmap.yaml exists in config/ but is not used — the launch loads the generic spot_nav2_params.yaml.",
    odomTopic: "/Spot/odometry — passed to rtabmap as the 'odom' subscription (Spot driver wheel/IMU), and read by Nav2's bt_navigator + velocity_smoother.",
    tfChain: "map→odom: rtabmap_slam · odom→base_link: Webots Spot driver · base_link→sensor_frames: robot_state_publisher (spot.urdf).",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from RTAB-Map) · obstacle_layer + voxel_layer → /scan (LaserScan from pointcloud_to_laserscan on the Velodyne cloud) · bt_navigator + velocity_smoother → /Spot/odometry.",
    launchFile: "inspector/launch/spot_nav2_sim_rtabmap.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d

  subgraph TOPICS["Topic flow"]
    direction LR
    SR([Webots Spot]):::sensor --> T1[/"/Spot/head_meta_camera/image_color (Image)"/]:::topic
    SR --> T2[/"/Spot/head_meta_camera/camera_info (CameraInfo)"/]:::topic
    SR --> T3[/"/Spot/head_meta_range_finder/image (Image, 32FC1)"/]:::topic
    SR --> T4[/"/Spot/head/imu (Imu)"/]:::topic
    SR --> T5[/"/Spot/odometry (Odometry)"/]:::topic
    SR --> T9[/"/Spot/Velodyne_Puck/point_cloud (PointCloud2)"/]:::topic
    T1 --> N2[rtabmap_slam/rtabmap]:::node
    T2 --> N2
    T3 --> N2
    T4 --> N2
    T5 --> N2
    N2 --> T8[/"/map (OccupancyGrid)"/]:::topic
    T9 --> N5[pointcloud_to_laserscan]:::node
    N5 --> T12[/"/scan (LaserScan)"/]:::topic
    T8 --> N3[Nav2 stack]:::node
    T12 --> N3
    T5 -- "bt_navigator.odom_topic" --> N3
    N3 --> T10[/"/cmd_vel (Twist)"/]:::topic
    T10 --> SR
  end

  subgraph TFCHAIN["TF chain: map -> odom -> base_link"]
    direction LR
    F0["map"]:::tf -- "rtabmap_slam" --> F1["odom"]:::tf
    F1 -- "Spot driver" --> F2["base_link"]:::tf
    F2 -- "robot_state_publisher (spot.urdf)" --> F3["sensor frames"]:::tf
  end

  subgraph NAV2["Nav2 subscriptions (spot_nav2_params.yaml — spot_nav2_params_rtabmap.yaml exists but is unused)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"/scan (LaserScan)"/]:::topic --> NN2[obstacle_layer + voxel_layer]:::nav
    NI3[/"/Spot/odometry (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  },
  {
    id: "S-05",
    robot: "Spot",
    distro: "Humble",
    name: "Localization only · AMCL on pre-built map · Nav2",
    sensors: "Velodyne Puck (/Spot/Velodyne_Puck/point_cloud) — used only to produce /scan for AMCL and Nav2.",
    slam: "AMCL (nav2_amcl) — localization only, no mapping. likelihood_field laser model, 500–2000 particles, transform_tolerance=1.0.",
    localization: "AMCL particle filter against pre-built static map. Publishes map→odom TF (tf_broadcast=True) and amcl_pose.",
    map: "Pre-built 2D occupancy grid loaded by nav2_map_server from webots_spot/map/map.yaml (+ .pgm). Managed by a dedicated lifecycle_manager_localization (separate from Nav2's own lifecycle manager).",
    planner: "Nav2 · controller_server + planner_server + bt_navigator (MPPI controller)",
    odomTopic: "/Spot/odometry — read by bt_navigator.odom_topic and velocity_smoother.odom_topic (spot_nav2_params.yaml).",
    tfChain: "map→odom: nav2_amcl · odom→base_link: Webots Spot driver · base_link→sensor_frames: robot_state_publisher (spot.urdf).",
    nav2Inputs: "global_costmap.static_layer → /map (OccupancyGrid from nav2_map_server) · obstacle_layer + voxel_layer → /scan (LaserScan from pointcloud_to_laserscan); AMCL also subscribes to /scan and /map · bt_navigator + velocity_smoother → /Spot/odometry.",
    launchFile: "inspector/launch/spot_nav2_sim_amcl.launch.py",
    mermaid: `flowchart TB
  classDef topic fill:#e6f0fa,stroke:#005bbb,stroke-width:1px,color:#002b5c
  classDef node fill:#ffffff,stroke:#0e0e0c,stroke-width:1.2px,color:#0e0e0c
  classDef sensor fill:#0e0e0c,stroke:#0e0e0c,color:#fff
  classDef tf fill:#fef3c7,stroke:#b45309,stroke-width:1px,color:#7c2d12
  classDef nav fill:#dcfce7,stroke:#166534,stroke-width:1px,color:#14532d

  subgraph TOPICS["Topic flow"]
    direction LR
    SR([Webots Spot / Spot driver]):::sensor --> T1[/"/Spot/Velodyne_Puck/point_cloud (PointCloud2)"/]:::topic
    SR --> T2[/"/Spot/odometry (Odometry)"/]:::topic
    F([webots_spot/map/map.yaml + .pgm]):::sensor --> N1[nav2_map_server]:::node
    T1 --> N2[pointcloud_to_laserscan]:::node
    N2 --> T3[/"/scan (LaserScan)"/]:::topic
    N1 --> T4[/"/map (OccupancyGrid)"/]:::topic
    T3 --> N3[nav2_amcl]:::node
    T4 --> N3
    N3 --> T6[/"amcl_pose (PoseWithCovarianceStamped)"/]:::topic
    T4 --> N4[Nav2 stack]:::node
    T3 --> N4
    T2 -- "bt_navigator.odom_topic" --> N4
    N4 --> T7[/"/cmd_vel (Twist)"/]:::topic
    T7 --> SR
  end

  subgraph TFCHAIN["TF chain: map -> odom -> base_link"]
    direction LR
    F0["map"]:::tf -- "nav2_amcl (tf_broadcast=true)" --> F1["odom"]:::tf
    F1 -- "Spot driver" --> F2["base_link"]:::tf
    F2 -- "robot_state_publisher (spot.urdf)" --> F3["sensor frames"]:::tf
  end

  subgraph NAV2["Nav2 subscriptions (spot_nav2_params.yaml)"]
    direction LR
    NI1[/"/map (OccupancyGrid)"/]:::topic --> NN1[global_costmap.static_layer]:::nav
    NI2[/"/scan (LaserScan)"/]:::topic --> NN2[obstacle_layer + voxel_layer]:::nav
    NI3[/"/Spot/odometry (Odometry)"/]:::topic --> NN3[bt_navigator + velocity_smoother]:::nav
  end`
  }
];

/* =========================================================
   FEATURE MATRIX — column groups and per-stack checks.
   Items render as one column each; groups render as a top
   header spanning their items. Edit here to add/remove
   columns; the table thead and tbody regenerate from this.
   ========================================================= */
const FEATURE_MATRIX = [
  {
    id: "sensors",
    label: "Sensors",
    items: [
      { id: "ouster",   label: "Ouster" },
      { id: "velodyne", label: "Velodyne" },
      { id: "imu",      label: "IMU" },
      { id: "rgbd",     label: "RGB-D" }
    ]
  },
  {
    id: "slam",
    label: "SLAM / Localization",
    items: [
      { id: "slam_toolbox", label: "slam_toolbox" },
      { id: "fastlio",      label: "FAST-LIO" },
      { id: "orbslam3",     label: "ORB-SLAM3" },
      { id: "rtabmap",      label: "RTAB-Map" },
      { id: "amcl",         label: "AMCL" }
    ]
  },
  {
    /* Every stack publishes a 2D occupancy grid to Nav2.
       Most stacks generate it at runtime; the AMCL stack loads it from disk. */
    id: "map",
    label: "2D grid via",
    items: [
      { id: "direct",   label: "Direct (SLAM)" },
      { id: "octomap",  label: "OctoMap → 2D" },
      { id: "dense",    label: "Dense 3D → 2D" },
      { id: "prebuilt", label: "Pre-built map" }
    ]
  },
  {
    id: "planner",
    label: "Planner",
    items: [
      { id: "nav2", label: "Nav2" }
    ]
  }
];

const STACK_FEATURES = {
  "J-01": { sensors: ["ouster"],              slam: ["slam_toolbox"],            map: ["direct"],  planner: ["nav2"] },
  "J-02": { sensors: ["ouster", "imu"],       slam: ["slam_toolbox", "fastlio"], map: ["direct"],  planner: ["nav2"] },
  "J-03": { sensors: ["ouster", "imu"],       slam: ["fastlio"],                 map: ["octomap"], planner: ["nav2"] },
  "S-01": { sensors: ["velodyne", "ouster"],  slam: ["slam_toolbox"],            map: ["direct"],  planner: ["nav2"] },
  "S-02": { sensors: ["velodyne", "imu"],     slam: ["fastlio"],                 map: ["octomap"], planner: ["nav2"] },
  "S-03": { sensors: ["velodyne", "rgbd"],    slam: ["orbslam3"],                map: ["octomap"], planner: ["nav2"] },
  "S-04": { sensors: ["rgbd", "imu"],         slam: ["rtabmap"],                 map: ["dense"],   planner: ["nav2"] },
  "S-05": { sensors: ["velodyne"],            slam: ["amcl"],                    map: ["prebuilt"],planner: ["nav2"] }
};

/* =========================================================
   REFERENCES
   ========================================================= */
const REFERENCES = [
  {
    tag: "SLAM",
    apa: "Macenski, S., & Jambrecic, I. (2021). SLAM Toolbox: SLAM for the dynamic world. Journal of Open Source Software, 6(61), 2783.",
    doi: "10.21105/joss.02783",
    url: "https://github.com/SteveMacenski/slam_toolbox",
    bibtex: `@article{macenski2021slam,
  title   = {SLAM Toolbox: SLAM for the dynamic world},
  author  = {Macenski, Steve and Jambrecic, Ivona},
  journal = {Journal of Open Source Software},
  volume  = {6}, number = {61}, pages = {2783}, year = {2021},
  doi     = {10.21105/joss.02783}
}`
  },
  {
    tag: "SLAM",
    apa: "Xu, W., & Zhang, F. (2021). FAST-LIO: A fast, robust LiDAR-inertial odometry package by tightly-coupled iterated Kalman filter. IEEE Robotics and Automation Letters, 6(2), 3317-3324.",
    doi: "10.1109/LRA.2021.3064227",
    url: "https://github.com/hku-mars/FAST_LIO",
    bibtex: `@article{xu2021fastlio,
  title   = {FAST-LIO: A fast, robust LiDAR-inertial odometry package by tightly-coupled iterated Kalman filter},
  author  = {Xu, Wei and Zhang, Fu},
  journal = {IEEE Robotics and Automation Letters},
  volume  = {6}, number = {2}, pages = {3317--3324}, year = {2021},
  doi     = {10.1109/LRA.2021.3064227}
}`
  },
  {
    tag: "SLAM",
    apa: "Xu, W., Cai, Y., He, D., Lin, J., & Zhang, F. (2022). FAST-LIO2: Fast direct LiDAR-inertial odometry. IEEE Transactions on Robotics, 38(4), 2053-2073.",
    doi: "10.1109/TRO.2022.3141876",
    url: "https://github.com/hku-mars/FAST_LIO",
    bibtex: `@article{xu2022fastlio2,
  title   = {FAST-LIO2: Fast direct LiDAR-inertial odometry},
  author  = {Xu, Wei and Cai, Yixi and He, Dongjiao and Lin, Jiarong and Zhang, Fu},
  journal = {IEEE Transactions on Robotics},
  volume  = {38}, number = {4}, pages = {2053--2073}, year = {2022},
  doi     = {10.1109/TRO.2022.3141876}
}`
  },
  {
    tag: "SLAM",
    apa: "Campos, C., Elvira, R., Rodríguez, J. J. G., Montiel, J. M. M., & Tardós, J. D. (2021). ORB-SLAM3: An accurate open-source library for visual, visual-inertial, and multi-map SLAM. IEEE Transactions on Robotics, 37(6), 1874-1890.",
    doi: "10.1109/TRO.2021.3075644",
    url: "https://github.com/UZ-SLAMLab/ORB_SLAM3",
    bibtex: `@article{campos2021orbslam3,
  title   = {{ORB-SLAM3}: An accurate open-source library for visual, visual-inertial, and multi-map {SLAM}},
  author  = {Campos, Carlos and Elvira, Richard and Rodr{\\'\\i}guez, Juan J. G{\\'o}mez and Montiel, J. M. M. and Tard{\\'o}s, Juan D.},
  journal = {IEEE Transactions on Robotics},
  volume  = {37}, number = {6}, pages = {1874--1890}, year = {2021},
  doi     = {10.1109/TRO.2021.3075644}
}`
  },
  {
    tag: "SLAM",
    apa: "Labbé, M., & Michaud, F. (2019). RTAB-Map as an open-source lidar and visual SLAM library for large-scale and long-term online operation. Journal of Field Robotics, 36(2), 416-446.",
    doi: "10.1002/rob.21831",
    url: "https://github.com/introlab/rtabmap_ros",
    bibtex: `@article{labbe2019rtabmap,
  title   = {{RTAB-Map} as an open-source lidar and visual {SLAM} library for large-scale and long-term online operation},
  author  = {Labb{\\'e}, Mathieu and Michaud, Fran{\\c{c}}ois},
  journal = {Journal of Field Robotics},
  volume  = {36}, number = {2}, pages = {416--446}, year = {2019},
  doi     = {10.1002/rob.21831}
}`
  },
  {
    tag: "Mapping",
    apa: "Hornung, A., Wurm, K. M., Bennewitz, M., Stachniss, C., & Burgard, W. (2013). OctoMap: An efficient probabilistic 3D mapping framework based on octrees. Autonomous Robots, 34(3), 189-206.",
    doi: "10.1007/s10514-012-9321-0",
    url: "https://github.com/OctoMap/octomap",
    bibtex: `@article{hornung2013octomap,
  title   = {{OctoMap}: An efficient probabilistic {3D} mapping framework based on octrees},
  author  = {Hornung, Armin and Wurm, Kai M. and Bennewitz, Maren and Stachniss, Cyrill and Burgard, Wolfram},
  journal = {Autonomous Robots},
  volume  = {34}, number = {3}, pages = {189--206}, year = {2013},
  doi     = {10.1007/s10514-012-9321-0}
}`
  },
  {
    tag: "Nav",
    apa: "Macenski, S., Martín, F., White, R., & Ginés Clavero, J. (2020). The Marathon 2: A navigation system. In IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS).",
    doi: "10.1109/IROS45743.2020.9341207",
    url: "https://github.com/ros-navigation/navigation2",
    bibtex: `@inproceedings{macenski2020marathon,
  title     = {The Marathon 2: A navigation system},
  author    = {Macenski, Steve and Mart{\\'\\i}n, Francisco and White, Ruffin and Gin{\\'e}s Clavero, Jonatan},
  booktitle = {IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS)},
  year      = {2020},
  doi       = {10.1109/IROS45743.2020.9341207}
}`
  },
  {
    tag: "Nav",
    apa: "Fox, D., Burgard, W., Dellaert, F., & Thrun, S. (1999). Monte Carlo Localization: Efficient position estimation for mobile robots. In Proceedings of AAAI.",
    url: "https://github.com/ros-navigation/navigation2/tree/main/nav2_amcl",
    bibtex: `@inproceedings{fox1999mcl,
  title     = {{Monte Carlo Localization}: Efficient position estimation for mobile robots},
  author    = {Fox, Dieter and Burgard, Wolfram and Dellaert, Frank and Thrun, Sebastian},
  booktitle = {Proceedings of the National Conference on Artificial Intelligence (AAAI)},
  year      = {1999}
}`
  },
  {
    tag: "Sim",
    apa: "Michel, O. (2004). Webots: Professional mobile robot simulation. International Journal of Advanced Robotic Systems, 1(1), 39-42.",
    doi: "10.5772/5618",
    url: "https://cyberbotics.com",
    bibtex: `@article{michel2004webots,
  title   = {Webots: Professional mobile robot simulation},
  author  = {Michel, Olivier},
  journal = {International Journal of Advanced Robotic Systems},
  volume  = {1}, number = {1}, pages = {39--42}, year = {2004},
  doi     = {10.5772/5618}
}`
  },
  {
    tag: "Sim",
    apa: "MASKOR. (2024). webots_spot — Webots ROS 2 driver bundle for Boston Dynamics Spot.",
    url: "https://github.com/MASKOR/webots_spot",
    bibtex: `@misc{maskor_webots_spot,
  title  = {{webots\\_spot}: Webots {ROS\\,2} driver bundle for {Boston Dynamics Spot}},
  author = {{MASKOR}},
  year   = {2024},
  url    = {https://github.com/MASKOR/webots_spot}
}`
  },
  {
    tag: "Platform",
    apa: "Clearpath Robotics. (2024). Jackal UGV — Software & Simulation Documentation.",
    url: "https://docs.clearpathrobotics.com/docs/ros2humble/ros/tutorials/simulator/install",
    bibtex: `@misc{clearpath_jackal,
  title  = {Jackal UGV --- Software \\& Simulation Documentation},
  author = {{Clearpath Robotics}},
  year   = {2024},
  url    = {https://docs.clearpathrobotics.com/docs/robots/outdoor_robots/jackal}
}`
  },
  {
    tag: "Platform",
    apa: "Boston Dynamics. (2024). Spot SDK — Developer Documentation.",
    url: "https://dev.bostondynamics.com",
    bibtex: `@misc{bd_spot_sdk,
  title  = {Spot SDK --- Developer Documentation},
  author = {{Boston Dynamics}},
  year   = {2024},
  url    = {https://dev.bostondynamics.com}
}`
  },
  {
    tag: "Platform",
    apa: "Ouster, Inc. (2024). ouster-ros: ROS 2 driver for OS-1 / OS-0 / OS-2 LiDARs.",
    url: "https://github.com/ouster-lidar/ouster-ros",
    bibtex: `@misc{ouster_ros,
  title  = {{ouster-ros}: {ROS\\,2} driver for {OS-1 / OS-0 / OS-2} {LiDARs}},
  author = {{Ouster, Inc.}},
  year   = {2024},
  url    = {https://github.com/ouster-lidar/ouster-ros}
}`
  }
];

/* =========================================================
   PROJECT CITATION
   ========================================================= */
const PROJECT_CITATION = {
  bibtex: `@software{zaher2026dronestack,
  author       = {Zaher, Ahmed and Adhivarahan, Charuvahan and Dantu, Karthik},
  title        = {{dronestack}: A customizable {ROS\\,2} navigation stack for
                  {Boston Dynamics Spot} and {Clearpath Jackal}},
  year         = {2026},
  publisher    = {GitHub},
  howpublished = {\\url{https://github.com/azaher1215/dronestack}},
  note         = {Drones Lab, University at Buffalo}
}`,
  apa: `Zaher, A., Adhivarahan, C., & Dantu, K. (2026). dronestack: A
customizable ROS 2 navigation stack for Boston Dynamics Spot and Clearpath
Jackal [Computer software]. Drones Lab, University at Buffalo.
https://github.com/azaher1215/dronestack`
};

/* =========================================================
   DOM helpers
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) {
    if (k == null) continue;
    e.append(k.nodeType ? k : document.createTextNode(k));
  }
  return e;
};

let currentFilter = "All";

function buildThead() {
  const thead = $("#stack-thead");
  thead.innerHTML = "";

  const top = el("tr", { class: "head-top" });
  top.append(
    el("th", { rowspan: "2", class: "head-sticky" }, "Stack"),
    el("th", { rowspan: "2" }, "Robot"),
    el("th", { rowspan: "2" }, "ROS 2 distro")
  );
  for (const g of FEATURE_MATRIX) {
    top.append(el("th", {
      colspan: String(g.items.length),
      class: "feat-h-group"
    }, g.label));
  }
  top.append(el("th", { rowspan: "2", class: "th-arrow", "aria-label": "" }));
  thead.append(top);

  const sub = el("tr", { class: "head-sub" });
  for (const g of FEATURE_MATRIX) {
    g.items.forEach((it, i) => {
      const isFirst = i === 0;
      sub.append(el("th", {
        class: `feat-h-item${isFirst ? " gp-start" : ""}`,
        scope: "col"
      }, el("span", { class: "vlabel" }, it.label)));
    });
  }
  thead.append(sub);
}

function launchBasenames(launchFile) {
  return launchFile.split(" · ").map(p =>
    p.split("/").pop().replace(/\.launch\.py$/, "")
  );
}

function renderTable() {
  buildThead();
  const tbody = $("#stack-tbody");
  tbody.innerHTML = "";
  const filtered = STACKS.filter(s => currentFilter === "All" || s.robot === currentFilter);
  for (const s of filtered) {
    const tr = el("tr", { "data-id": s.id, tabindex: "0" });
    const lfDiv = el("div", { class: "launch-file" });
    launchBasenames(s.launchFile).forEach((b, i) => {
      if (i > 0) lfDiv.append(el("br"));
      lfDiv.append(b);
    });
    tr.append(
      el("td", { class: "cell-sticky" }, lfDiv),
      el("td", {}, el("span", { class: `robot-tag ${s.robot.toLowerCase()}` }, s.robot)),
      el("td", {}, el("span", { class: "dist-tag" }, s.distro))
    );
    const feats = STACK_FEATURES[s.id] || {};
    for (const g of FEATURE_MATRIX) {
      const set = new Set(feats[g.id] || []);
      g.items.forEach((it, i) => {
        const on = set.has(it.id);
        const isFirst = i === 0;
        tr.append(el("td", {
          class: `cell-feat${on ? " has" : ""}${isFirst ? " gp-start" : ""}`,
          "aria-label": on ? `${g.label}: ${it.label}` : `${g.label}: ${it.label} — not used`
        },
          on
            ? el("span", { class: "check", "aria-hidden": "true" }, "✓")
            : el("span", { class: "dash", "aria-hidden": "true" }, "·")
        ));
      });
    }
    tr.append(el("td", { class: "open-arrow", "aria-label": "Open flowchart" }, "→"));
    tr.addEventListener("click", () => openOverlay(s));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openOverlay(s); }
    });
    tbody.append(tr);
  }
}

function renderFilters() {
  const robots = ["All", "Jackal", "Spot"];
  const wrap = $("#filters");
  wrap.innerHTML = "";
  for (const r of robots) {
    const count = r === "All" ? STACKS.length : STACKS.filter(s => s.robot === r).length;
    const btn = el("button", {
      class: "chip",
      type: "button",
      "aria-pressed": String(r === currentFilter),
      onclick: () => { currentFilter = r; renderFilters(); renderTable(); }
    }, r, el("span", { class: "count" }, String(count)));
    wrap.append(btn);
  }
}

/* =========================================================
   References
   ========================================================= */
function renderReferences() {
  const list = $("#ref-list");
  list.innerHTML = "";
  REFERENCES.forEach((r, i) => {
    const num = String(i + 1).padStart(2, "0");
    const text = el("div", { class: "ref-text" });
    text.append(document.createTextNode(r.apa));
    const doi = el("span", { class: "doi" });
    if (r.doi) {
      doi.append(el("a", { href: `https://doi.org/${r.doi}`, target: "_blank", rel: "noopener" }, `doi:${r.doi}`));
    }
    if (r.url) {
      if (r.doi) doi.append(document.createTextNode("  ·  "));
      doi.append(el("a", { href: r.url, target: "_blank", rel: "noopener" }, r.url.replace(/^https?:\/\//, "")));
    }
    text.append(doi);
    list.append(
      el("li", {},
        el("div", { class: "ref-num" }, num),
        text,
        el("div", { class: "ref-tag" }, r.tag)
      )
    );
  });
}

/* =========================================================
   FULLSCREEN OVERLAY + Mermaid + pan/zoom
   ========================================================= */
const overlay = {
  el: null, stage: null, svg: null,
  scale: 1, tx: 0, ty: 0,
  dragging: false, lastX: 0, lastY: 0,
  minScale: 0.2, maxScale: 5,
  currentId: null
};

function applyTransform() {
  if (!overlay.svg) return;
  overlay.svg.style.transform = `translate(${overlay.tx}px, ${overlay.ty}px) scale(${overlay.scale})`;
  overlay.svg.style.transformOrigin = "0 0";
  $("#zoom-pct").textContent = Math.round(overlay.scale * 100) + "%";
}

function fitToStage() {
  if (!overlay.svg || !overlay.stage) return;
  const stageRect = overlay.stage.getBoundingClientRect();
  overlay.svg.style.transform = "none";
  const svgRect = overlay.svg.getBoundingClientRect();
  const pad = 48;
  const sx = (stageRect.width - pad * 2) / svgRect.width;
  const sy = (stageRect.height - pad * 2) / svgRect.height;
  overlay.scale = Math.min(sx, sy, 1.4);
  const newW = svgRect.width * overlay.scale;
  const newH = svgRect.height * overlay.scale;
  overlay.tx = (stageRect.width - newW) / 2;
  overlay.ty = (stageRect.height - newH) / 2;
  applyTransform();
}

async function renderMermaidInto(stage, code, id) {
  stage.innerHTML = "";
  try {
    // Wait for web fonts so mermaid measures labels with the actual font
    // metrics — otherwise shapes are sized for the fallback and text overflows.
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const { svg } = await window.mermaid.render(`m_${id}_${Date.now()}`, code);
    stage.innerHTML = svg;
    overlay.svg = stage.querySelector("svg");
    if (overlay.svg) {
      overlay.svg.style.maxWidth = "none";
      overlay.svg.style.height = "auto";
      overlay.svg.removeAttribute("width");
      overlay.svg.removeAttribute("height");
      // Defensive: foreignObject defaults to overflow:hidden in some browsers,
      // which would still clip wrapped html labels at the SVG layer.
      overlay.svg.querySelectorAll("foreignObject").forEach(fo => {
        fo.setAttribute("overflow", "visible");
        fo.style.overflow = "visible";
      });
    }
  } catch (err) {
    stage.innerHTML = `<pre style="padding:20px;color:#b45309;font-family:var(--font-mono);font-size:12px">Mermaid render error:\n${(err && err.message) || err}</pre>`;
  }
}

async function openOverlay(stack) {
  overlay.currentId = stack.id;
  overlay.el.dataset.open = "true";
  $("#ov-title").textContent = launchBasenames(stack.launchFile).join("  ·  ");
  $("#ov-sub").textContent = `${stack.robot}  ·  ROS 2 ${stack.distro}  ·  ${stack.name}`;
  $("#ov-meta-robot").textContent = stack.robot;
  $("#ov-meta-distro").textContent = stack.distro;
  $("#ov-meta-sensors").textContent = stack.sensors;
  $("#ov-meta-slam").textContent = stack.slam;
  $("#ov-meta-planner").textContent = stack.planner;
  await renderMermaidInto(overlay.stage, stack.mermaid, stack.id);
  requestAnimationFrame(() => requestAnimationFrame(fitToStage));
  document.body.style.overflow = "hidden";
}

function closeOverlay() {
  overlay.el.dataset.open = "false";
  document.body.style.overflow = "";
  overlay.svg = null;
}

function zoomBy(factor, cx, cy) {
  const stageRect = overlay.stage.getBoundingClientRect();
  const px = (cx ?? stageRect.width / 2) - stageRect.left;
  const py = (cy ?? stageRect.height / 2) - stageRect.top;
  const newScale = Math.max(overlay.minScale, Math.min(overlay.maxScale, overlay.scale * factor));
  const ratio = newScale / overlay.scale;
  overlay.tx = px - (px - overlay.tx) * ratio;
  overlay.ty = py - (py - overlay.ty) * ratio;
  overlay.scale = newScale;
  applyTransform();
}

function initOverlay() {
  overlay.el = $("#overlay");
  overlay.stage = $("#mermaid-stage");

  $("#zoom-in").addEventListener("click", () => zoomBy(1.2));
  $("#zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
  $("#zoom-reset").addEventListener("click", fitToStage);
  $("#zoom-100").addEventListener("click", () => {
    const stageRect = overlay.stage.getBoundingClientRect();
    if (!overlay.svg) return;
    overlay.svg.style.transform = "none";
    const r = overlay.svg.getBoundingClientRect();
    overlay.scale = 1;
    overlay.tx = (stageRect.width - r.width) / 2;
    overlay.ty = (stageRect.height - r.height) / 2;
    applyTransform();
  });
  $("#close-overlay").addEventListener("click", closeOverlay);

  overlay.stage.addEventListener("mousedown", (e) => {
    overlay.dragging = true;
    overlay.lastX = e.clientX; overlay.lastY = e.clientY;
    overlay.stage.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", (e) => {
    if (!overlay.dragging) return;
    overlay.tx += e.clientX - overlay.lastX;
    overlay.ty += e.clientY - overlay.lastY;
    overlay.lastX = e.clientX; overlay.lastY = e.clientY;
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    overlay.dragging = false;
    if (overlay.stage) overlay.stage.style.cursor = "grab";
  });

  overlay.stage.addEventListener("wheel", (e) => {
    if (overlay.el.dataset.open !== "true") return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomBy(factor, e.clientX, e.clientY);
  }, { passive: false });

  let pinchStart = null;
  overlay.stage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      overlay.dragging = true;
      overlay.lastX = e.touches[0].clientX;
      overlay.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      overlay.dragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart = { d: Math.hypot(dx, dy), scale: overlay.scale };
    }
  }, { passive: true });
  overlay.stage.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && overlay.dragging) {
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      overlay.tx += x - overlay.lastX;
      overlay.ty += y - overlay.lastY;
      overlay.lastX = x; overlay.lastY = y;
      applyTransform();
    } else if (e.touches.length === 2 && pinchStart) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      const factor = (d / pinchStart.d) / (overlay.scale / pinchStart.scale);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomBy(factor, cx, cy);
    }
  }, { passive: true });
  overlay.stage.addEventListener("touchend", () => {
    overlay.dragging = false;
    pinchStart = null;
  });

  overlay.stage.style.cursor = "grab";

  window.addEventListener("keydown", (e) => {
    if (overlay.el.dataset.open !== "true") return;
    if (e.key === "Escape") closeOverlay();
    if (e.key === "+" || e.key === "=") zoomBy(1.2);
    if (e.key === "-") zoomBy(1 / 1.2);
    if (e.key === "0") fitToStage();
  });
}

/* =========================================================
   Copy buttons
   ========================================================= */
function wireCopyButtons() {
  $$("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-copy");
      const node = document.querySelector(target);
      if (!node) return;
      const text = node.innerText;
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = orig; }, 1400);
      } catch {
        btn.textContent = "Press ⌘C";
      }
    });
  });
}

function fillProjectCitation() {
  $("#cite-bibtex").textContent = PROJECT_CITATION.bibtex;
  $("#cite-apa").textContent = PROJECT_CITATION.apa;
}

/* =========================================================
   Init
   ========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    flowchart: {
      curve: "basis",
      padding: 16,
      nodeSpacing: 50,
      rankSpacing: 80,
      htmlLabels: true,
      useMaxWidth: false,
      wrappingWidth: 280
    },
    themeVariables: {
      primaryColor: "#ffffff",
      primaryTextColor: "#0e0e0c",
      primaryBorderColor: "#0e0e0c",
      lineColor: "#6b6b65",
      tertiaryColor: "#e6f0fa",
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: "14px"
    }
  });

  renderFilters();
  renderTable();
  renderReferences();
  fillProjectCitation();
  initOverlay();
  wireCopyButtons();
});
