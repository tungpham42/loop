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

  const [videoTitle, setVideoTitle] = useState<string>("");
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [currentLoopTitle, setCurrentLoopTitle] = useState<string>("");
  const [currentSpeed, setCurrentSpeed] = useState<number>(1);
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);

  const extractVideoId = (input: string): string | null => {
    const cleanInput = input.trim();
    if (
      cleanInput.length === 11 &&
      !cleanInput.includes("/") &&
      !cleanInput.includes("?")
    ) {
      return cleanInput;
    }
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = cleanInput.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

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

      if (aParam !== null && bParam !== null) {
        setLoopA(Number(aParam));
        setLoopB(Number(bParam));
      }
      if (sParam !== null) {
        setCurrentSpeed(Number(sParam));
      }
    }
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }
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
            changeSpeedStep(1);
            break;
          case "j":
            e.preventDefault();
            changeSpeedStep(-1);
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

    const fetchedTitle = event.target.getVideoData()?.title || "My Loop";
    setVideoTitle(fetchedTitle);

    if (!currentLoopTitle) {
      setCurrentLoopTitle(fetchedTitle);
    }

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
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
  };

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

  const saveCurrentLoop = () => {
    // Only check for videoId, no longer block if loopA or loopB are null
    if (!videoId) return;

    const newLoop: SavedLoop = {
      id: Date.now().toString(),
      title: currentLoopTitle || videoTitle || "My Loop",
      a: loopA ?? 0, // Fallback to 0 if not set
      b: loopB ?? duration, // Fallback to the full duration if not set
      speed: currentSpeed,
    };

    const updatedLoops = [...savedLoops, newLoop];
    setSavedLoops(updatedLoops);
    localStorage.setItem(`yt-loops-${videoId}`, JSON.stringify(updatedLoops));
    message.success("Loop saved successfully!");
  };

  const applySavedLoop = (loop: SavedLoop) => {
    const loopSpeed = loop.speed || 1;
    setLoopA(loop.a);
    setLoopB(loop.b);
    setCurrentLoopTitle(loop.title);
    setCurrentSpeed(loopSpeed);

    if (player) {
      player.setPlaybackRate(loopSpeed);
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

  const getLoopUrl = (loop: SavedLoop) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?v=${videoId}&a=${loop.a}&b=${loop.b}&s=${loop.speed || 1}`;
  };

  const copyLoop = (loop: SavedLoop) => {
    const url = getLoopUrl(loop);
    navigator.clipboard.writeText(url);
    message.success("Link copied!");
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
            handleSize: 24,
            handleSizeHover: 28,
            trackBg: "#FF6B6B",
            trackHoverBg: "#FF8E53",
            railSize: 8,
          },
        },
      }}
    >
      <div className="app-container">
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <Title level={1} className="title-gradient" style={{ margin: 0 }}>
            <PlayCircleFilled
              style={{
                color: "#FF6B6B",
                marginRight: "8px",
                fontSize: "1em",
                verticalAlign: "middle",
              }}
            />
            SOFT Loop
          </Title>
          <Text className="subtitle-text">
            Repetition made effortless. Mastery made inevitable.
          </Text>
        </div>

        <Card className="cozy-card" bodyStyle={{ padding: "12px" }}>
          {/* Changed from Space.Compact to flex container to wrap nicely on mobile */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <Input
              autoFocus
              size="large"
              placeholder="Paste YouTube URL or ID here"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined style={{ color: "#b2bec3" }} />}
              allowClear
              style={{ flex: "1 1 200px" }}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleSearch}
              style={{ flex: "0 0 auto", width: "100%" }}
              className="mobile-full-width"
            >
              Load Video
            </Button>
          </div>
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

            <Card className="cozy-card card-body-mobile" title="Controls">
              {/* Prominent Call-To-Action Row */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "24px",
                }}
              >
                <Button
                  size="large"
                  shape="round"
                  icon={<PlaySquareOutlined />}
                  onClick={startVideo}
                  style={{ fontWeight: "bold" }}
                >
                  Start
                </Button>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  icon={
                    isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
                  }
                  onClick={togglePlay}
                  style={{
                    fontWeight: "bold",
                    boxShadow: "0 4px 12px rgba(255, 107, 107, 0.4)",
                  }}
                >
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  icon={<RetweetOutlined />}
                  onClick={startManualLoop}
                  style={{
                    fontWeight: "bold",
                    backgroundColor: "#ff4757",
                    borderColor: "#ff4757",
                    boxShadow: "0 4px 12px rgba(255, 71, 87, 0.4)",
                  }}
                >
                  Loop
                </Button>
              </div>

              {/* Visual Timeline Slider */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <Text strong>Visual A/B Loop Slider</Text>
                </div>

                <div style={{ padding: "8px 0" }}>
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

                {/* Current Loop Saving Section - Converted to flex wrap */}
                <div
                  className="loop-save-container"
                  style={{
                    marginTop: "16px",
                    background: "#f9f9f9",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px dashed #d9d9d9",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "center",
                  }}
                >
                  <Space wrap size="small" style={{ justifyContent: "center" }}>
                    <Tag color="volcano" className="mobile-tag">
                      A: {formatTime(loopA || 0)}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      to
                    </Text>
                    <Tag color="orange" className="mobile-tag">
                      B: {formatTime(loopB || duration)}
                    </Tag>
                    <Tag color="blue" className="mobile-tag">
                      {currentSpeed}x
                    </Tag>
                  </Space>

                  <Space.Compact
                    style={{
                      flexGrow: 1,
                      minWidth: "100%",
                      justifyContent: "center",
                    }}
                  >
                    <Input
                      value={currentLoopTitle}
                      onChange={(e) => setCurrentLoopTitle(e.target.value)}
                      placeholder="Loop Name"
                      style={{ maxWidth: "200px" }}
                    />
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={saveCurrentLoop}
                    >
                      Save
                    </Button>
                  </Space.Compact>
                </div>
              </div>

              {/* Secondary Controls Row (Skip, Speed, Clear) */}
              <Row
                gutter={[8, 16]}
                justify="center"
                align="middle"
                style={{
                  background: "#fdfdfd",
                  padding: "16px 8px",
                  borderRadius: "16px",
                  border: "1px solid #f0f0f0",
                }}
              >
                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Space>
                    <Button
                      shape="round"
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

                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Space>
                    <Text strong>Speed:</Text>
                    <Select
                      value={currentSpeed}
                      style={{ width: 100 }}
                      onChange={handleSpeedChange}
                      options={[
                        { value: 0.25, label: "0.25x" },
                        { value: 0.5, label: "0.5x" },
                        { value: 0.75, label: "0.75x" },
                        { value: 1, label: "Normal" },
                        { value: 1.25, label: "1.25x" },
                        { value: 1.5, label: "1.5x" },
                        { value: 2, label: "2.0x" },
                      ]}
                    />
                  </Space>
                </Col>

                <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                  <Button
                    type="text"
                    danger
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
                    Clear
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Saved Loops Section */}
            {savedLoops.length > 0 && (
              <Card
                className="cozy-card card-body-mobile"
                title="My Saved Loops"
                style={{ marginTop: "16px" }}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={savedLoops}
                  renderItem={(loop) => (
                    <List.Item
                      actions={[
                        <Tooltip title="Copy Link" key="copy">
                          <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => copyLoop(loop)}
                          />
                        </Tooltip>,
                        <Tooltip title="Share" key="share">
                          <Button
                            type="text"
                            icon={<ShareAltOutlined />}
                            onClick={() => shareLoop(loop)}
                          />
                        </Tooltip>,
                        <Tooltip title="Load" key="load">
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={() => applySavedLoop(loop)}
                          />
                        </Tooltip>,
                        <Popconfirm
                          title="Delete?"
                          onConfirm={() => deleteLoop(loop.id)}
                          okText="Yes"
                          cancelText="No"
                          key="delete"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Text strong style={{ fontSize: "14px" }}>
                            {loop.title}
                          </Text>
                        }
                        description={
                          <span
                            style={{ fontSize: "12px" }}
                          >{`${formatTime(loop.a)} - ${formatTime(loop.b)} (${loop.speed || 1}x)`}</span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* Keyboard Shortcuts Info Card - Hidden on Mobile */}
            <div className="hide-on-mobile">
              <Card
                className="cozy-card"
                style={{
                  marginTop: "16px",
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
            </div>
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default App;
