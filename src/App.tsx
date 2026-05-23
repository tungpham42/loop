import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Typography,
  Card,
  Space,
  Tag,
  message,
  Slider,
  Select,
  Row,
  Col,
  ConfigProvider,
  List,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  PlayCircleFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  HourglassOutlined,
  RetweetOutlined,
  PlaySquareOutlined,
  PauseCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import "./App.css";

const { Title, Text } = Typography;

interface SavedLoop {
  id: string;
  title: string;
  a: number;
  b: number;
  speed?: number;
}

const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const App: React.FC = () => {
  const [inputUrl, setInputUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Track the actual YouTube video title
  const [videoTitle, setVideoTitle] = useState<string>("");

  // Loop states
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [currentLoopTitle, setCurrentLoopTitle] = useState<string>("");

  // State to track the current playback speed
  const [currentSpeed, setCurrentSpeed] = useState<number>(1);

  // Saved loops state
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);

  // Extract video ID from URL
  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Handle URL replacement & Load Saved Loops & Load URL Loops
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get("v");
    const aParam = urlParams.get("a");
    const bParam = urlParams.get("b");
    const sParam = urlParams.get("s");

    let currentVideoId = null;

    if (vParam && vParam.length === 11) {
      currentVideoId = vParam;
    } else {
      const pathId = window.location.pathname.replace("/", "");
      if (pathId.length === 11) {
        currentVideoId = pathId;
      }
    }

    if (currentVideoId) {
      setVideoId(currentVideoId);
      setInputUrl(`https://www.youtube.com/watch?v=${currentVideoId}`);
      loadSavedLoops(currentVideoId);

      // Pre-load loop boundaries and speed if they exist in the URL
      if (aParam !== null && bParam !== null) {
        setLoopA(Number(aParam));
        setLoopB(Number(bParam));
      }
      if (sParam !== null) {
        setCurrentSpeed(Number(sParam));
      }
    }
  }, []);

  // Handle AB Looping Logic
  useEffect(() => {
    let loopInterval: NodeJS.Timeout;

    if (player && loopA !== null && loopB !== null) {
      loopInterval = setInterval(async () => {
        const currentTime = await player.getCurrentTime();
        if (currentTime >= loopB) {
          player.seekTo(loopA, true);
        }
      }, 100);
    }

    return () => {
      if (loopInterval) clearInterval(loopInterval);
    };
  }, [player, loopA, loopB]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow normal typing inside input fields
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case "b":
            e.preventDefault();
            skipTime(-5);
            break;
          case "l":
            e.preventDefault();
            startManualLoop();
            break;
          case "p":
            e.preventDefault();
            togglePlay();
            break;
          case "u":
            e.preventDefault();
            changeSpeedStep(1); // Speed up
            break;
          case "j":
            e.preventDefault();
            changeSpeedStep(-1); // Speed down
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, isPlaying, currentSpeed, loopA]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedLoops = (id: string) => {
    const localLoops = localStorage.getItem(`yt-loops-${id}`);
    if (localLoops) {
      setSavedLoops(JSON.parse(localLoops));
    } else {
      setSavedLoops([]);
    }
  };

  const handleSearch = () => {
    const id = extractVideoId(inputUrl);
    if (id) {
      // Update URL to reflect the new video ID, clearing only the loop parameters (a, b, s)
      window.history.pushState(
        {},
        document.title,
        `${window.location.pathname}?v=${id}`,
      );

      setVideoId(id);
      setLoopA(null);
      setLoopB(null);
      setDuration(0);
      setCurrentSpeed(1);
      setVideoTitle("");
      setCurrentLoopTitle("");
      loadSavedLoops(id);
    } else {
      message.error("Hmm, that doesn't look like a valid YouTube URL!");
    }
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    setPlayer(event.target);
    event.target.unMute();
    event.target.setVolume(50);

    // Fetch the actual YouTube video title from the player data
    const fetchedTitle = event.target.getVideoData()?.title || "My Loop";
    setVideoTitle(fetchedTitle);

    if (!currentLoopTitle) {
      setCurrentLoopTitle(fetchedTitle);
    }

    // Snap to loaded loop A and Speed immediately on ready if parsed from URL
    const urlParams = new URLSearchParams(window.location.search);
    const aParam = urlParams.get("a");
    const sParam = urlParams.get("s");

    if (aParam) {
      event.target.seekTo(Number(aParam), true);
    }
    if (sParam) {
      event.target.setPlaybackRate(Number(sParam));
    }
  };

  const onStateChange = (event: YouTubeEvent) => {
    if (!duration && event.target.getDuration() > 0) {
      setDuration(event.target.getDuration());
    }
    // Update play/pause state (1 = playing, 2 = paused)
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
  };

  // --- Core Controls ---

  const handleSliderChange = (values: number[]) => {
    setLoopA(values[0]);
    setLoopB(values[1]);
    if (player) player.seekTo(values[0], true);
  };

  const handleSpeedChange = (value: number) => {
    setCurrentSpeed(value);
    if (player) {
      player.setPlaybackRate(value);
      message.success(`Speed smoothly set to ${value}x`);
    }
  };

  const changeSpeedStep = (direction: 1 | -1) => {
    const currentIndex = SPEED_STEPS.indexOf(currentSpeed);
    if (currentIndex !== -1) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < SPEED_STEPS.length) {
        handleSpeedChange(SPEED_STEPS[nextIndex]);
      }
    }
  };

  const skipTime = async (seconds: number) => {
    if (player) {
      const currentTime = await player.getCurrentTime();
      player.seekTo(currentTime + seconds, true);
    }
  };

  const togglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const startVideo = () => {
    if (!player) return;
    player.seekTo(loopA !== null ? loopA : 0, true);
    player.playVideo();
  };

  const startManualLoop = () => {
    if (player) {
      player.seekTo(loopA || 0, true);
      player.playVideo();
    }
  };

  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
    setCurrentLoopTitle(videoTitle || "My Loop");
    // Clear URL parameters dynamically
    window.history.pushState(
      {},
      document.title,
      `${window.location.pathname}?v=${videoId}`,
    );
    message.info("Loop cleared. Ready for a new segment!");
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) return "--:--";
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Saved Loops Logic ---

  const saveCurrentLoop = () => {
    if (!videoId || loopA === null || loopB === null) return;

    // Save speed configuration with loop
    const newLoop: SavedLoop = {
      id: Date.now().toString(),
      title: currentLoopTitle || videoTitle || "My Loop",
      a: loopA,
      b: loopB,
      speed: currentSpeed,
    };

    const updatedLoops = [...savedLoops, newLoop];
    setSavedLoops(updatedLoops);
    localStorage.setItem(`yt-loops-${videoId}`, JSON.stringify(updatedLoops));
    message.success("Loop saved successfully!");
  };

  const applySavedLoop = (loop: SavedLoop) => {
    const loopSpeed = loop.speed || 1; // Fallback to 1 for older saves
    setLoopA(loop.a);
    setLoopB(loop.b);
    setCurrentLoopTitle(loop.title);
    setCurrentSpeed(loopSpeed); // Update dropdown state

    if (player) {
      player.setPlaybackRate(loopSpeed); // Apply speed to player
      player.seekTo(loop.a, true);
      player.playVideo();
    }
    message.info(`Loaded loop: ${loop.title} at ${loopSpeed}x`);
  };

  const deleteLoop = (idToRemove: string) => {
    const updatedLoops = savedLoops.filter((loop) => loop.id !== idToRemove);
    setSavedLoops(updatedLoops);
    if (videoId) {
      localStorage.setItem(`yt-loops-${videoId}`, JSON.stringify(updatedLoops));
    }
    message.success("Loop deleted");
  };

  // Generate specific loop link including speed
  const getLoopUrl = (loop: SavedLoop) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?v=${videoId}&a=${loop.a}&b=${loop.b}&s=${loop.speed || 1}`;
  };

  const copyLoop = (loop: SavedLoop) => {
    const url = getLoopUrl(loop);
    navigator.clipboard.writeText(url);
    message.success(
      "Link copied! Anyone with this link can load your exact loop and speed.",
    );
  };

  const shareLoop = async (loop: SavedLoop) => {
    const url = getLoopUrl(loop);
    if (navigator.share) {
      try {
        await navigator.share({
          title: loop.title,
          text: `Check out this looped section: ${loop.title}`,
          url: url,
        });
      } catch (err) {
        console.error("Error sharing loop", err);
      }
    } else {
      copyLoop(loop);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          colorPrimary: "#FF6B6B",
          borderRadius: 16,
          colorBgContainer: "#ffffff",
          colorTextBase: "#2d3436",
        },
        components: {
          Slider: {
            handleSize: 24, // Much larger drag handles
            handleSizeHover: 28, // Even larger on hover
            trackBg: "#FF6B6B",
            trackHoverBg: "#FF8E53",
            railSize: 8, // Thicker background track
          },
        },
      }}
    >
      <div className="app-container">
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <Title level={1} className="title-gradient" style={{ margin: 0 }}>
            <PlayCircleFilled
              style={{
                color: "#FF6B6B",
                marginRight: "12px",
                fontSize: "36px",
                verticalAlign: "middle",
              }}
            />
            SOFT Loop
          </Title>
          <Text style={{ fontSize: "16px", color: "#636e72", fontWeight: 500 }}>
            Master any skill by looping exactly the parts you need.
          </Text>
        </div>

        <Card className="cozy-card" bodyStyle={{ padding: "8px" }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              autoFocus
              size="large"
              placeholder="Paste a YouTube URL to get started..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onPressEnter={handleSearch}
              prefix={
                <SearchOutlined
                  style={{ color: "#b2bec3", fontSize: "18px" }}
                />
              }
              allowClear
              style={{ fontSize: "16px", padding: "12px 16px" }}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleSearch}
              style={{ padding: "0 32px", fontSize: "16px", height: "auto" }}
            >
              Load Video
            </Button>
          </Space.Compact>
        </Card>

        {videoId && (
          <>
            <div className="video-responsive">
              <YouTube
                videoId={videoId}
                onReady={onPlayerReady}
                onStateChange={onStateChange}
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    autoplay: 1,
                    playsinline: 1,
                    mute: 1,
                    loop: 1,
                    playlist: videoId,
                  },
                }}
              />
            </div>

            <Card className="cozy-card" title="Playback & Loop Controls">
              {/* --- Prominent Call-To-Action Row at the Top --- */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "16px",
                  marginBottom: "32px",
                }}
              >
                <Button
                  size="large"
                  shape="round"
                  icon={<PlaySquareOutlined />}
                  onClick={startVideo}
                  style={{
                    height: "50px",
                    padding: "0 32px",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  Start
                </Button>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  title="Cmd/Ctrl + P"
                  icon={
                    isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
                  }
                  onClick={togglePlay}
                  style={{
                    height: "50px",
                    padding: "0 32px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    boxShadow: "0 6px 16px rgba(255, 107, 107, 0.4)",
                  }}
                >
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  title="Cmd/Ctrl + L"
                  icon={<RetweetOutlined />}
                  onClick={startManualLoop}
                  style={{
                    height: "50px",
                    padding: "0 40px",
                    fontSize: "18px",
                    fontWeight: "bold",
                    backgroundColor: "#ff4757", // Deeper red for ultra prominence
                    borderColor: "#ff4757",
                    boxShadow: "0 6px 16px rgba(255, 71, 87, 0.4)",
                  }}
                >
                  Loop
                </Button>
              </div>

              {/* Visual Timeline Slider */}
              <div style={{ marginBottom: "32px", padding: "0 16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Text strong style={{ fontSize: "16px" }}>
                    Visual A/B Loop Slider
                  </Text>
                  <Text type="secondary" style={{ fontSize: "14px" }}>
                    Drag to set your loop boundaries
                  </Text>
                </div>

                {/* The Slider itself, now much thicker and easier to grab */}
                <div style={{ padding: "2px 0" }}>
                  <Slider
                    range
                    min={0}
                    max={duration || 100}
                    value={[loopA || 0, loopB || duration || 100]}
                    onChange={handleSliderChange}
                    tooltip={{
                      formatter: (value: number | null | undefined) =>
                        formatTime(value),
                    }}
                    disabled={!duration}
                  />
                </div>

                {/* Current Loop Saving Section */}
                <Row
                  justify="space-between"
                  align="middle"
                  style={{
                    marginTop: "24px",
                    background: "#f9f9f9",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px dashed #d9d9d9",
                  }}
                >
                  <Col>
                    <Space size="small" direction="vertical">
                      <Space>
                        <Tag
                          color="volcano"
                          style={{
                            padding: "6px 16px",
                            fontSize: "15px",
                            borderRadius: "8px",
                          }}
                        >
                          A: {formatTime(loopA || 0)}
                        </Tag>
                        <Text type="secondary">to</Text>
                        <Tag
                          color="orange"
                          style={{
                            padding: "6px 16px",
                            fontSize: "15px",
                            borderRadius: "8px",
                            margin: 0,
                          }}
                        >
                          B: {formatTime(loopB || duration)}
                        </Tag>
                        <Tag
                          color="blue"
                          style={{
                            padding: "6px 16px",
                            fontSize: "15px",
                            borderRadius: "8px",
                            margin: 0,
                          }}
                        >
                          {currentSpeed}x
                        </Tag>
                      </Space>
                    </Space>
                  </Col>
                  <Col>
                    <Space.Compact>
                      <Input
                        size="large"
                        value={currentLoopTitle}
                        onChange={(e) => setCurrentLoopTitle(e.target.value)}
                        placeholder="Loop Name"
                        disabled={loopA === null || loopB === null}
                        style={{ width: 160 }}
                      />
                      <Button
                        size="large"
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={saveCurrentLoop}
                        disabled={loopA === null || loopB === null}
                      >
                        Save
                      </Button>
                    </Space.Compact>
                  </Col>
                </Row>
              </div>

              {/* Secondary Controls Row (Skip, Speed, Clear) */}
              <Row
                gutter={[16, 24]}
                justify="center"
                align="middle"
                style={{
                  background: "#fdfdfd",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid #f0f0f0",
                }}
              >
                {/* Skip Block */}
                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Space>
                    <Button
                      shape="round"
                      title="Cmd/Ctrl + B"
                      icon={<StepBackwardOutlined />}
                      onClick={() => skipTime(-5)}
                    >
                      -5s
                    </Button>
                    <Button
                      shape="round"
                      icon={<StepForwardOutlined />}
                      onClick={() => skipTime(5)}
                    >
                      +5s
                    </Button>
                  </Space>
                </Col>

                {/* Speed Block */}
                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Space>
                    <Tooltip title="Shortcut: Cmd/Ctrl + U (Up) / J (Down)">
                      <Text strong style={{ cursor: "help" }}>
                        Speed:
                      </Text>
                    </Tooltip>
                    <Select
                      value={currentSpeed} // Tied directly to state
                      style={{ width: 110 }}
                      onChange={handleSpeedChange}
                      options={[
                        {
                          value: 0.25,
                          label: (
                            <span>
                              0.25x <HourglassOutlined />
                            </span>
                          ),
                        },
                        { value: 0.5, label: "0.5x" },
                        { value: 0.75, label: "0.75x" },
                        { value: 1, label: "Normal" },
                        { value: 1.25, label: "1.25x" },
                        { value: 1.5, label: "1.5x" },
                        {
                          value: 2,
                          label: (
                            <span>
                              2.0x <ThunderboltOutlined />
                            </span>
                          ),
                        },
                      ]}
                    />
                  </Space>
                </Col>

                {/* Clear Block */}
                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Button
                    type="text"
                    danger
                    size="large"
                    shape="round"
                    icon={<CloseCircleOutlined />}
                    onClick={clearLoop}
                    disabled={loopA === null && loopB === null}
                    style={{
                      fontWeight: "bold",
                      backgroundColor:
                        loopA !== null || loopB !== null
                          ? "#fff1f0"
                          : "transparent",
                    }}
                  >
                    Clear Loop
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Saved Loops Section */}
            {savedLoops.length > 0 && (
              <Card
                className="cozy-card"
                title="My Saved Loops"
                style={{ marginTop: "24px" }}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={savedLoops}
                  renderItem={(loop) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          icon={<CopyOutlined />}
                          onClick={() => copyLoop(loop)}
                          title="Copy Link"
                        />,
                        <Button
                          type="text"
                          icon={<ShareAltOutlined />}
                          onClick={() => shareLoop(loop)}
                          title="Share"
                        />,
                        <Button
                          type="text"
                          icon={<PlayCircleOutlined />}
                          onClick={() => applySavedLoop(loop)}
                        >
                          Load
                        </Button>,
                        <Popconfirm
                          title="Delete this loop?"
                          onConfirm={() => deleteLoop(loop.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Delete"
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong>{loop.title}</Text>}
                        description={`From ${formatTime(loop.a)} to ${formatTime(loop.b)} at ${loop.speed || 1}x`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* Keyboard Shortcuts Info Card */}
            <Card
              className="cozy-card"
              style={{
                marginTop: "24px",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
              }}
              bodyStyle={{ padding: "16px 24px" }}
            >
              <div style={{ marginBottom: "12px" }}>
                <Text strong style={{ fontSize: "16px" }}>
                  ⌨️ Quick Keyboard Shortcuts
                </Text>
              </div>
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} md={5}>
                  <Text type="secondary">Play / Pause</Text>
                  <br />
                  <Tag style={{ marginTop: "4px" }}>Cmd/Ctrl + P</Tag>
                </Col>
                <Col xs={12} sm={8} md={5}>
                  <Text type="secondary">Retrigger Loop</Text>
                  <br />
                  <Tag style={{ marginTop: "4px" }}>Cmd/Ctrl + L</Tag>
                </Col>
                <Col xs={12} sm={8} md={5}>
                  <Text type="secondary">Skip Back 5s</Text>
                  <br />
                  <Tag style={{ marginTop: "4px" }}>Cmd/Ctrl + B</Tag>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Text type="secondary">Speed Up</Text>
                  <br />
                  <Tag style={{ marginTop: "4px" }}>Cmd/Ctrl + U</Tag>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Text type="secondary">Speed Down</Text>
                  <br />
                  <Tag style={{ marginTop: "4px" }}>Cmd/Ctrl + J</Tag>
                </Col>
              </Row>
            </Card>
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default App;
