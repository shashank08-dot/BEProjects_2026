import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  Image,
  Grid,
  FileText,
  CheckCircle,
  Settings,
  Play,
  Trophy,
  Home,
  History,
  Maximize2,
  Crop,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
  Minimize2,
} from "lucide-react";

// Configuration - Update this with your server URL
// const API_BASE_URL = "http://localhost:5000"; // Change to your server URL

// Line 14-23 - Update API URL detection
const getAPIUrl = () => {
  // If running on HF Spaces (always HTTPS, no port needed)
  if (window.location.hostname.includes("hf.space")) {
    // HF automatically routes /api to the backend on same Space
    return window.location.origin;
  }

  // Local development - explicitly use port 7860
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:7860";
  }

  // Fallback to environment variable
  return process.env.REACT_APP_API_URL || "http://localhost:7860";
};

const API_BASE_URL = getAPIUrl();

console.log("🔗 API URL:", API_BASE_URL); // Debug log
const CrosswordSolver = () => {
  // Main state
  const [currentPage, setCurrentPage] = useState("home");
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Page-specific states
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [cluesData, setCluesData] = useState(null);
  const [solvedData, setSolvedData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const imageRef = useRef(null);

  // Cropping states
  const [cropCoords, setCropCoords] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  });
  const [gridDimensions, setGridDimensions] = useState({ rows: 15, cols: 15 });
  const [acrossCrops, setAcrossCrops] = useState([
    { id: 1, x: 50, y: 300, width: 200, height: 100 },
  ]);
  const [downCrops, setDownCrops] = useState([
    { id: 1, x: 300, y: 300, width: 200, height: 100 },
  ]);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenCrop, setFullscreenCrop] = useState(null);

  // Solution page states
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [highlightedClue, setHighlightedClue] = useState(null);
  const [revealMode, setRevealMode] = useState("partial");
  const [revealedClues, setRevealedClues] = useState(new Set());

  // Terminal states for real solving
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [isRealSolving, setIsRealSolving] = useState(false);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);

  // Progress steps
  const steps = [
    { id: "upload", name: "Upload Image", icon: Upload },
    { id: "grid", name: "Process Grid", icon: Grid },
    { id: "clues", name: "Process Clues", icon: FileText },
    { id: "validate", name: "Validate", icon: CheckCircle },
    { id: "xd", name: "Create XD", icon: Settings },
    { id: "solve", name: "Solve Puzzle", icon: Play },
    { id: "solution", name: "View Solution", icon: Trophy },
  ];

  // API helper function
  const apiCall = async (endpoint, data = null, method = "GET") => {
    try {
      setError(null);
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "API request failed");
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // File upload handler
  const handleFileUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.session_id);
        setImageInfo(result.image_info);
        setUploadedImage(result.image_info.preview_image);
        setProgress(1);
        setCurrentPage("grid-processing");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fixed processGrid function with proper coordinate scaling
  const processGrid = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Get the image element to check bounds (same as processClues)
      const imageElement = document.querySelector('img[alt="Crossword"]');

      // Validate and scale coordinates
      const validatedCrop = validateCropBounds(cropCoords, imageElement);

      console.log("Grid crop - original vs scaled:", {
        original: cropCoords,
        scaled: validatedCrop,
      });

      const result = await apiCall(
        "/api/process-grid",
        {
          session_id: sessionId,
          crop_coordinates: [
            Math.round(validatedCrop.x),
            Math.round(validatedCrop.y),
            Math.round(validatedCrop.width),
            Math.round(validatedCrop.height),
          ],
          rows: parseInt(gridDimensions.rows),
          cols: parseInt(gridDimensions.cols),
        },
        "POST"
      );

      setGridData(result);
      setProgress(2);
      setCurrentPage("clues-processing");
    } catch (err) {
      console.error("Grid processing failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clues processing
  const processClues = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Get the image element to check bounds
      const imageElement = document.querySelector('img[alt="Crossword"]');

      // Validate and scale coordinates
      const validatedAcross = acrossCrops.map((crop) => {
        const validated = validateCropBounds(crop, imageElement);
        return [
          Math.round(validated.x),
          Math.round(validated.y),
          Math.round(validated.width),
          Math.round(validated.height),
        ];
      });

      const validatedDown = downCrops.map((crop) => {
        const validated = validateCropBounds(crop, imageElement);
        return [
          Math.round(validated.x),
          Math.round(validated.y),
          Math.round(validated.width),
          Math.round(validated.height),
        ];
      });

      console.log("Sending coordinates:", { validatedAcross, validatedDown }); // Debug log

      const result = await apiCall(
        "/api/process-clues",
        {
          session_id: sessionId,
          across_coordinates: validatedAcross,
          down_coordinates: validatedDown,
        },
        "POST"
      );

      setCluesData(result);
      setProgress(3);
      setCurrentPage("validation");
    } catch (err) {
      console.error("Clues processing failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fix the validateCropBounds function to properly handle coordinate scaling
  const validateCropBounds = (crop, imageElement) => {
    if (!imageElement) return crop;

    const imageWidth = imageElement.naturalWidth || imageElement.width;
    const imageHeight = imageElement.naturalHeight || imageElement.height;
    const displayWidth = imageElement.offsetWidth || imageElement.width;
    const displayHeight = imageElement.offsetHeight || imageElement.height;

    // Calculate scale factors from display to actual image
    const scaleX = imageWidth / displayWidth;
    const scaleY = imageHeight / displayHeight;

    // Scale the crop coordinates to actual image dimensions
    const scaledCrop = {
      x: Math.max(0, Math.min(crop.x * scaleX, imageWidth - 10)),
      y: Math.max(0, Math.min(crop.y * scaleY, imageHeight - 10)),
      width: Math.max(
        10,
        Math.min(crop.width * scaleX, imageWidth - crop.x * scaleX)
      ),
      height: Math.max(
        10,
        Math.min(crop.height * scaleY, imageHeight - crop.y * scaleY)
      ),
    };

    console.log("Coordinate scaling:", {
      original: crop,
      scaled: scaledCrop,
      scales: { scaleX, scaleY },
      imageDimensions: { imageWidth, imageHeight, displayWidth, displayHeight },
    });

    return scaledCrop;
  };

  // Validation
  const validatePuzzle = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const result = await apiCall(
        "/api/validate",
        {
          session_id: sessionId,
        },
        "POST"
      );

      setValidationData(result);
      if (result.validation.is_valid) {
        setProgress(4);
        setCurrentPage("xd-creation");
      } else {
        setError("Puzzle validation failed. Please check grid and clues.");
      }
    } catch (err) {
      console.error("Validation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const updateClues = async (updatedClues) => {
    if (!sessionId) {
      console.warn("No sessionId, cannot update clues.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiCall(
        "/api/update-clues",
        {
          session_id: sessionId,
          clues: updatedClues, // should have { across: [...], down: [...] }
        },
        "POST"
      );
    } catch (err) {
      console.error("Update clues failed:", err);
      setError("An error occurred while updating clues.");
    } finally {
      setLoading(false);
    }
  };

  const updateGrid = async (newGrid) => {
    if (!sessionId) {
      console.warn("No sessionId, cannot update grid.");
      return;
    }

    try {
      const result = await apiCall(
        "/api/update-grid",
        {
          session_id: sessionId,
          grid: newGrid,
        },
        "POST"
      );
      console.log("Grid updated successfully:", result);
    } catch (err) {
      console.error("Update grid failed:", err);
      setError("An error occurred while updating grid.");
    }
  };

  // XD Creation
  const createXD = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const result = await apiCall(
        "/api/create-xd",
        {
          session_id: sessionId,
        },
        "POST"
      );

      setProgress(5);
      setCurrentPage("solving");
    } catch (err) {
      console.error("XD creation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real solve puzzle with actual API integration
  const solvePuzzle = async () => {
    if (!sessionId) return;

    setLoading(true);
    setIsRealSolving(true);
    setTerminalOutput([]);

    // Add initial terminal output
    const addTerminalLine = (line) => {
      setTerminalOutput((prev) => [...prev, line]);
      if (terminalRef.current) {
        setTimeout(() => {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }, 100);
      }
    };

    addTerminalLine("🎯 Starting crossword solver...");
    addTerminalLine("Loading model and puzzle data...");

    try {
      // Call the actual solve API
      const result = await apiCall(
        "/api/solve",
        {
          session_id: sessionId,
          alpha: confidenceThreshold,
        },
        "POST"
      );

      if (result.success) {
        console.log("========== DEBUG: API RESPONSE ==========");
        console.log("Full result:", result);
        console.log("Completion stats:", result.completion_stats);
        console.log("Total cells:", result.completion_stats?.total_cells);
        console.log("Unsolved cells:", result.completion_stats?.unsolved_cells);
        console.log("Solved cells:", result.completion_stats?.solved_cells);
        console.log(
          "Completion %:",
          result.completion_stats?.completion_percentage
        );
        console.log("Solving time:", result.solving_time);
        console.log("=========================================");
        // Add completion messages
        addTerminalLine(`✅ Solving completed!`);
        addTerminalLine(
          `⏱️ Time: ${
            result.solution.solving_time?.toFixed(2) || "N/A"
          } seconds`
        );
        addTerminalLine(
          `🎯 Completion: ${
            result.solution.completion_stats?.completion_percentage?.toFixed(
              1
            ) || "N/A"
          }%`
        );

        setSolvedData(result);
        setProgress(6);
        setTimeout(() => {
          setCurrentPage("solution");
          setIsRealSolving(false);
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      addTerminalLine(`❌ Error: ${err.message}`);
      console.error("Solving failed:", err);
      setIsRealSolving(false);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced cropping component
  const EnhancedCropper = ({
    image,
    cropArea,
    onCropChange,
    title,
    showOverlay = true,
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [dragStartCrop, setDragStartCrop] = useState(cropArea);
    const [previewCrop, setPreviewCrop] = useState(cropArea);

    useEffect(() => {
      setPreviewCrop(cropArea);
    }, [cropArea]);

    const handleMouseDown = (e, action) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(action === "move");
      setIsResizing(action !== "move" ? action : null);
      setStartPos({ x: e.clientX, y: e.clientY });
      setDragStartCrop(previewCrop); // store crop at start of drag
    };

    const handleMouseMove = (e) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;

      let newCrop = { ...dragStartCrop }; // start from initial crop

      if (isDragging) {
        newCrop.x = Math.max(0, dragStartCrop.x + dx);
        newCrop.y = Math.max(0, dragStartCrop.y + dy);
      } else if (isResizing) {
        switch (isResizing) {
          case "nw":
            newCrop.x = dragStartCrop.x + dx;
            newCrop.y = dragStartCrop.y + dy;
            newCrop.width = dragStartCrop.width - dx;
            newCrop.height = dragStartCrop.height - dy;
            break;
          case "ne":
            newCrop.y = dragStartCrop.y + dy;
            newCrop.width = dragStartCrop.width + dx;
            newCrop.height = dragStartCrop.height - dy;
            break;
          case "sw":
            newCrop.x = dragStartCrop.x + dx;
            newCrop.width = dragStartCrop.width - dx;
            newCrop.height = dragStartCrop.height + dy;
            break;
          case "se":
            newCrop.width = dragStartCrop.width + dx;
            newCrop.height = dragStartCrop.height + dy;
            break;
        }

        // Minimum size
        newCrop.width = Math.max(20, newCrop.width);
        newCrop.height = Math.max(20, newCrop.height);
        newCrop.x = Math.max(0, newCrop.x);
        newCrop.y = Math.max(0, newCrop.y);
      }

      setPreviewCrop(newCrop); // only update visual preview
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      onCropChange(previewCrop); // apply final crop
    };

    useEffect(() => {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleMouseMove);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }, [isDragging, isResizing, startPos, dragStartCrop]);

    return (
      <div className="relative">
        <div className="relative border rounded-lg overflow-hidden bg-gray-100">
          <img
            src={`data:image/jpeg;base64,${image}`}
            alt="Crossword"
            className="w-full h-auto select-none"
            draggable={false}
          />
          {showOverlay && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move"
              style={{
                left: `${previewCrop.x}px`,
                top: `${previewCrop.y}px`,
                width: `${previewCrop.width}px`,
                height: `${previewCrop.height}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, "move")}
              onTouchStart={(e) => handleMouseDown(e, "move")}
            >
              {["nw", "ne", "sw", "se"].map((corner) => (
                <div
                  key={corner}
                  className="absolute w-4 h-4 bg-blue-600 border border-white rounded-full cursor-pointer hover:bg-blue-700"
                  style={{
                    top: corner.includes("n") ? -6 : "auto",
                    bottom: corner.includes("s") ? -6 : "auto",
                    left: corner.includes("w") ? -6 : "auto",
                    right: corner.includes("e") ? -6 : "auto",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, corner)}
                  onTouchStart={(e) => handleMouseDown(e, corner)}
                />
              ))}
              {title && (
                <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  {title}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowFullscreen(true)}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const EnhancedCropOverlay = ({ crop, title, color, onUpdate, onRemove }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [dragStartCrop, setDragStartCrop] = useState(crop);
    const [previewCrop, setPreviewCrop] = useState(crop);

    useEffect(() => {
      setPreviewCrop(crop);
    }, [crop]);

    const colorClasses = {
      blue: "border-blue-500 bg-blue-500",
      green: "border-green-500 bg-green-500",
    };

    const handleMouseDown = (e, action) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(action === "move");
      setIsResizing(action !== "move" ? action : null);
      setStartPos({ x: e.clientX, y: e.clientY });
      setDragStartCrop(previewCrop);
    };

    const handleMouseMove = useCallback(
      (e) => {
        if (!isDragging && !isResizing) return;

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;

        let newCrop = { ...dragStartCrop };

        if (isDragging) {
          newCrop.x = Math.max(0, dragStartCrop.x + dx);
          newCrop.y = Math.max(0, dragStartCrop.y + dy);
        } else if (isResizing) {
          switch (isResizing) {
            case "nw":
              newCrop.x = dragStartCrop.x + dx;
              newCrop.y = dragStartCrop.y + dy;
              newCrop.width = dragStartCrop.width - dx;
              newCrop.height = dragStartCrop.height - dy;
              break;
            case "ne":
              newCrop.y = dragStartCrop.y + dy;
              newCrop.width = dragStartCrop.width + dx;
              newCrop.height = dragStartCrop.height - dy;
              break;
            case "sw":
              newCrop.x = dragStartCrop.x + dx;
              newCrop.width = dragStartCrop.width - dx;
              newCrop.height = dragStartCrop.height + dy;
              break;
            case "se":
              newCrop.width = dragStartCrop.width + dx;
              newCrop.height = dragStartCrop.height + dy;
              break;
          }

          newCrop.width = Math.max(20, newCrop.width);
          newCrop.height = Math.max(20, newCrop.height);
          newCrop.x = Math.max(0, newCrop.x);
          newCrop.y = Math.max(0, newCrop.y);
        }

        setPreviewCrop(newCrop);
      },
      [isDragging, isResizing, startPos, dragStartCrop]
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      setIsResizing(null);
      onUpdate(previewCrop);
    }, [previewCrop, onUpdate]);

    useEffect(() => {
      if (isDragging || isResizing) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("touchmove", handleMouseMove);
        document.addEventListener("touchend", handleMouseUp);

        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.removeEventListener("touchmove", handleMouseMove);
          document.removeEventListener("touchend", handleMouseUp);
        };
      }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    return (
      <div
        className={`absolute border-2 ${colorClasses[color]} bg-opacity-20 cursor-move`}
        style={{
          left: `${previewCrop.x}px`,
          top: `${previewCrop.y}px`,
          width: `${previewCrop.width}px`,
          height: `${previewCrop.height}px`,
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
        onTouchStart={(e) => handleMouseDown(e, "move")}
      >
        {["nw", "ne", "sw", "se"].map((corner) => (
          <div
            key={corner}
            className={`absolute w-4 h-4 ${
              colorClasses[color].split(" ")[1]
            } border border-white rounded-full cursor-pointer hover:opacity-80`}
            style={{
              top: corner.includes("n") ? -6 : "auto",
              bottom: corner.includes("s") ? -6 : "auto",
              left: corner.includes("w") ? -6 : "auto",
              right: corner.includes("e") ? -6 : "auto",
            }}
            onMouseDown={(e) => handleMouseDown(e, corner)}
            onTouchStart={(e) => handleMouseDown(e, corner)}
          />
        ))}
        <div
          className={`absolute top-1 left-1 ${
            colorClasses[color].split(" ")[1]
          } text-white text-xs px-2 py-1 rounded`}
        >
          {title}
        </div>
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600 z-50"
          style={{ cursor: "pointer" }}
        >
          ×
        </button>
      </div>
    );
  };

  // Navigation component
  const Navigation = () => (
    <div className="bg-white shadow-lg border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Crossword Solver
            </h1>
            <div className="hidden sm:flex space-x-1">
              <button
                onClick={() => setCurrentPage("home")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === "home"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Home size={20} />
                <span>Home</span>
              </button>
              <button
                onClick={() => setCurrentPage("previous")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === "previous"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <History size={20} />
                <span>Previous</span>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className="sm:hidden flex space-x-2">
            <button
              onClick={() => setCurrentPage("home")}
              className={`p-2 rounded-lg ${
                currentPage === "home"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600"
              }`}
            >
              <Home size={20} />
            </button>
            <button
              onClick={() => setCurrentPage("previous")}
              className={`p-2 rounded-lg ${
                currentPage === "previous"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600"
              }`}
            >
              <History size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          {sessionId && (
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {Math.round((progress / 6) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / 6) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile progress bar */}
        {sessionId && (
          <div className="lg:hidden pb-2 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">
                Step {progress} of 6
              </span>
              <span className="text-xs font-medium text-gray-700">
                {Math.round((progress / 6) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress / 6) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Home Page
  const HomePage = () => (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Upload Your Crossword Puzzle
        </h2>
        <p className="text-gray-600">
          Upload an image of your crossword puzzle to start the solving process
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById("file-upload").click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) handleFileUpload(files[0]);
          }}
        >
          <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            Drop your crossword image here
          </h3>
          <p className="text-gray-500 mb-4">or click to select a file</p>
          <p className="text-xs sm:text-sm text-gray-400">
            Supported formats: PNG, JPG, JPEG, BMP, TIFF (max 16MB)
          </p>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg,.bmp,.tiff,.tif"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
        </div>

        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Uploading and processing image...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const GridProcessingPage = () => {
    // Function to get cropped canvas
    const getCroppedCanvas = () => {
      if (!uploadedImage || !cropCoords) return null;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = document.createElement("img");

      img.onload = () => {
        canvas.width = cropCoords.width;
        canvas.height = cropCoords.height;

        ctx.drawImage(
          img,
          cropCoords.x,
          cropCoords.y,
          cropCoords.width,
          cropCoords.height,
          0,
          0,
          cropCoords.width,
          cropCoords.height
        );
      };

      img.src = uploadedImage;
      return canvas;
    };

    // Function to get cropped image data URL
    const getCroppedImageDataUrl = () => {
      if (!uploadedImage || !cropCoords) return null;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = document.createElement("img"); // Fixed: use document.createElement instead of new Image()

      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = cropCoords.width;
          canvas.height = cropCoords.height;

          ctx.drawImage(
            img,
            cropCoords.x,
            cropCoords.y,
            cropCoords.width,
            cropCoords.height,
            0,
            0,
            cropCoords.width,
            cropCoords.height
          );

          resolve(canvas.toDataURL());
        };
        img.src = uploadedImage;
      });
    };

    const [croppedPreview, setCroppedPreview] = React.useState(null);

    // Update cropped preview when crop coordinates change
    React.useEffect(() => {
      if (uploadedImage && cropCoords) {
        getCroppedImageDataUrl().then((dataUrl) => {
          setCroppedPreview(dataUrl);
        });
      }
    }, [uploadedImage, cropCoords]);

    return (
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Process Grid
          </h2>
          <p className="text-gray-600">
            Crop the crossword grid and set dimensions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Grid Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rows
                </label>
                <input
                  type="number"
                  defaultValue={gridDimensions.rows}
                  onChange={(e) => {
                    // e.preventDefault();
                    const val = e.target.value;
                    setGridDimensions((prev) => ({
                      ...prev,
                      rows: e.target.value === "" ? "" : Number(e.target.value),
                    }));
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="5"
                  max="25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Columns
                </label>
                <input
                  type="number"
                  value={gridDimensions.cols}
                  onChange={(e) => {
                    e.preventDefault();
                    setGridDimensions((prev) => ({
                      ...prev,
                      cols: e.target.value === "" ? "" : Number(e.target.value),
                    }));
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="5"
                  max="25"
                />
              </div>
            </div>

            {/* Cropped Area Preview */}
            {croppedPreview && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">
                  Cropped Area Preview
                </h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={croppedPreview}
                    alt="Cropped grid area"
                    className="max-w-full h-auto mx-auto rounded border"
                    style={{ maxHeight: "200px" }}
                  />
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Dimensions: {cropCoords?.width}×{cropCoords?.height} pixels
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={processGrid}
              disabled={loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing Grid..." : "Process Grid"}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Select Grid Area</h3>

            {uploadedImage && (
              <EnhancedCropper
                image={uploadedImage}
                cropArea={cropCoords}
                onCropChange={setCropCoords}
                onConfirm={processGrid}
                title="Grid"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Clues Processing Page
  const CluesProcessingPage = () => {
    const [imageDimensions, setImageDimensions] = useState({
      width: 0,
      height: 0,
    });
    const imageRef = useRef(null);

    // Add this function
    const handleImageLoad = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight,
        });
      }
    };
    const addCropArea = (type) => {
      const newId = Date.now();
      const newCrop = { id: newId, x: 100, y: 100, width: 150, height: 80 };

      if (type === "across") {
        setAcrossCrops([...acrossCrops, newCrop]);
      } else {
        setDownCrops([...downCrops, newCrop]);
      }
    };

    const updateCropArea = (type, id, newCoords) => {
      if (type === "across") {
        setAcrossCrops((crops) =>
          crops.map((crop) =>
            crop.id === id ? { ...crop, ...newCoords } : crop
          )
        );
      } else {
        setDownCrops((crops) =>
          crops.map((crop) =>
            crop.id === id ? { ...crop, ...newCoords } : crop
          )
        );
      }
    };

    const removeCropArea = (type, id) => {
      if (type === "across") {
        setAcrossCrops((crops) => crops.filter((crop) => crop.id !== id));
      } else {
        setDownCrops((crops) => crops.filter((crop) => crop.id !== id));
      }
    };

    return (
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Process Clues
          </h2>
          <p className="text-gray-600">
            Select areas containing across and down clues
          </p>
        </div>

        <div className="space-y-6">
          {/* Across Clues */}
          {/* // In CluesProcessingPage, replace the image rendering sections: */}
          {/* Across Clues */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-600">
                Across Clues
              </h3>
              <button
                onClick={() => addCropArea("across")}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Add Area
              </button>
            </div>

            {uploadedImage && (
              <div className="flex justify-center">
                <div
                  className="relative inline-block border rounded-lg overflow-visible bg-gray-100"
                  style={{
                    width: imageDimensions.width || "auto",
                    height: imageDimensions.height || "auto",
                  }}
                >
                  <img
                    ref={imageRef}
                    src={`data:image/jpeg;base64,${uploadedImage}`}
                    alt="Crossword"
                    className="block w-full h-full select-none"
                    draggable={false}
                    onLoad={handleImageLoad}
                  />

                  {/* Render crop areas over the image */}
                  {acrossCrops.map((crop, index) => (
                    <EnhancedCropOverlay
                      key={`across-${crop.id}`}
                      crop={crop}
                      title={`Across ${index + 1}`}
                      color="blue"
                      onUpdate={(newCoords) =>
                        updateCropArea("across", crop.id, newCoords)
                      }
                      onRemove={() => removeCropArea("across", crop.id)}
                    />
                  ))}
                </div>

                {/* <button
                  onClick={() => setShowFullscreen(true)}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button> */}
              </div>
            )}
          </div>
          {/* Down Clues */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-600">
                Down Clues
              </h3>
              <button
                onClick={() => addCropArea("down")}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Add Area
              </button>
            </div>

            {uploadedImage && (
              <div className="flex justify-center">
                <div
                  className="relative inline-block border rounded-lg overflow-visible bg-gray-100"
                  style={{
                    width: imageDimensions.width || "auto",
                    height: imageDimensions.height || "auto",
                  }}
                >
                  <img
                    src={`data:image/jpeg;base64,${uploadedImage}`}
                    alt="Crossword"
                    className="block w-full h-full select-none"
                    draggable={false}
                  />

                  {/* Render crop areas over the image */}
                  {downCrops.map((crop, index) => (
                    <EnhancedCropOverlay
                      key={`down-${crop.id}`}
                      crop={crop}
                      title={`Down ${index + 1}`}
                      color="green"
                      onUpdate={(newCoords) =>
                        updateCropArea("down", crop.id, newCoords)
                      }
                      onRemove={() => removeCropArea("down", crop.id)}
                    />
                  ))}
                </div>

                {/* <button
                  onClick={() => setShowFullscreen(true)}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button> */}
              </div>
            )}
          </div>
          {/* Process Button */}
          <div className="text-center">
            <button
              onClick={processClues}
              disabled={
                loading || (acrossCrops.length === 0 && downCrops.length === 0)
              }
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing Clues..." : "Process Clues"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  //u can add below to aabove

  // {/* Fullscreen Overlay */}
  //       {/* Fullscreen Overlay */}
  //       {showFullscreen && (
  //         <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
  //           <div className="relative max-w-full max-h-full bg-white rounded-lg overflow-hidden">
  //             <div className="flex justify-between items-center p-4 border-b">
  //               <h3 className="text-lg font-semibold">
  //                 Fullscreen Image Editor
  //               </h3>
  //               <div className="flex items-center space-x-2">
  //                 <button
  //                   onClick={() => addCropArea("across")}
  //                   className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
  //                 >
  //                   Add Across
  //                 </button>
  //                 <button
  //                   onClick={() => addCropArea("down")}
  //                   className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
  //                 >
  //                   Add Down
  //                 </button>
  //                 <button
  //                   onClick={() => setShowFullscreen(false)}
  //                   className="p-2 hover:bg-gray-100 rounded-full transition-colors"
  //                 >
  //                   <X size={20} />
  //                 </button>
  //               </div>
  //             </div>
  //             <div className="p-4 max-w-6xl max-h-[80vh] overflow-auto">
  //               <div className="relative">
  //                 <img
  //                   src={`data:image/jpeg;base64,${uploadedImage}`}
  //                   alt="Crossword Fullscreen"
  //                   className="w-full h-auto select-none"
  //                   draggable={false}
  //                 />

  //                 {/* Render all crop areas with enhanced cropper functionality */}
  //                 {acrossCrops.map((crop, index) => (
  //                   <EnhancedCropOverlay
  //                     key={`across-${crop.id}`}
  //                     crop={crop}
  //                     title={`Across ${index + 1}`}
  //                     color="blue"
  //                     onUpdate={(newCoords) =>
  //                       updateCropArea("across", crop.id, newCoords)
  //                     }
  //                     onRemove={() => removeCropArea("across", crop.id)}
  //                   />
  //                 ))}

  //                 {downCrops.map((crop, index) => (
  //                   <EnhancedCropOverlay
  //                     key={`down-${crop.id}`}
  //                     crop={crop}
  //                     title={`Down ${index + 1}`}
  //                     color="green"
  //                     onUpdate={(newCoords) =>
  //                       updateCropArea("down", crop.id, newCoords)
  //                     }
  //                     onRemove={() => removeCropArea("down", crop.id)}
  //                   />
  //                 ))}
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       )}

  // Validation Page - Now shows actual data
  const ValidationPage = () => (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Validation
        </h2>
        <p className="text-gray-600">Review grid and clues before solving</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grid Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Grid Editor</h3>
            {gridData?.grid ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid gap-0 border-2 border-gray-400 inline-block">
                  {gridData.grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      {row.map((cell, colIndex) => (
                        <div
                          key={colIndex}
                          onClick={async () => {
                            // Toggle locally first
                            const newGrid = gridData.grid.map((r, rIdx) =>
                              r.map((c, cIdx) =>
                                rIdx === rowIndex && cIdx === colIndex
                                  ? c === "#"
                                    ? " "
                                    : "#"
                                  : c
                              )
                            );

                            const updatedGrid = {
                              ...gridData,
                              grid: newGrid,
                              grid_info: {
                                rows: newGrid.length,
                                cols: newGrid[0].length,
                              },
                            };

                            setGridData(updatedGrid);

                            // 🔥 Sync with backend using the new function
                            await updateGrid(newGrid);
                          }}
                          className={`w-6 h-6 border border-gray-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                            cell === "#" || cell === "*"
                              ? "bg-black text-white"
                              : "bg-white text-black"
                          }`}
                        >
                          {cell !== "#" && cell !== "*" ? cell : ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Grid Size: {gridData.grid_info?.rows || gridDimensions.rows} ×{" "}
                  {gridData.grid_info?.cols || gridDimensions.cols}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-gray-500">
                Grid data not available
              </div>
            )}
          </div>

          {/* Clues Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Clues Preview</h3>
            {cluesData?.clues ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-700 mb-2">Across</h4>
                  <textarea
                    value={
                      cluesData.clues.across?.join("\n") || "" // Changed: expects array of strings
                    }
                    onChange={(e) => {
                      console.log(
                        "DEBUG textarea change fired, value:",
                        e.target.value
                      );
                      const updatedLines = e.target.value.split("\n");
                      const newClues = {
                        ...cluesData,
                        clues: {
                          // Added: nested structure
                          ...cluesData.clues,
                          across: updatedLines,
                        },
                      };

                      setCluesData(newClues);
                      updateClues(newClues.clues); // Changed: use .clues
                    }}
                    className="w-full h-32 p-2 border rounded text-sm font-mono"
                  />
                </div>
                <div className="bg-green-50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-green-700 mb-2">Down</h4>
                  <textarea
                    value={
                      cluesData.clues.down?.join("\n") || "" // Changed: expects array of strings
                    }
                    onChange={(e) => {
                      console.log(
                        "DEBUG textarea change fired, value:",
                        e.target.value
                      );
                      const updatedLines = e.target.value.split("\n");
                      const newClues = {
                        ...cluesData,
                        clues: {
                          // Added: nested structure
                          ...cluesData.clues,
                          down: updatedLines,
                        },
                      };

                      setCluesData(newClues);
                      updateClues(newClues.clues); // Changed: use .clues
                    }}
                    className="w-full h-32 p-2 border rounded text-sm font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-gray-500">
                Clues data not available
              </div>
            )}
          </div>
        </div>

        {/* Validation Results */}
        {validationData && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Validation Status</h4>
            <div className="text-sm">
              {validationData.ready_for_xd ? (
                <div className="text-green-600">
                  ✓ Puzzle is valid and ready for solving
                </div>
              ) : (
                <div className="text-red-600">✗ Puzzle validation failed</div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={validatePuzzle}
          disabled={loading}
          className="w-full mt-6 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Validating..." : "Validate & Continue"}
        </button>
      </div>
    </div>
  );

  // XD Creation Page
  const XDCreationPage = () => (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8 text-center">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <Settings className="h-12 w-12 sm:h-16 sm:w-16 text-purple-600 mx-auto mb-4 animate-spin" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Creating XD File
        </h2>
        <p className="text-gray-600 mb-8">
          Converting your grid and clues into the standard crossword format...
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span>Grid structure validated</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span>Clues parsed and numbered</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 animate-pulse"></div>
              <span>Creating XD file format...</span>
            </div>
          </div>
        </div>

        <button
          onClick={createXD}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating XD File..." : "Create XD File"}
        </button>
      </div>
    </div>
  );

  // Solving Page - Real terminal integration
  const SolvingPage = () => (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Solving Puzzle
        </h2>
        <p className="text-gray-600">
          AI solver is working on your crossword...
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 ">
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> */}
        {/* <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Play className="h-5 w-5 mr-2 text-green-600" />
              Solver Output
            </h3>

            <div
              ref={terminalRef}
              className="bg-black text-green-400 font-mono text-xs sm:text-sm p-4 rounded-lg h-64 sm:h-96 overflow-y-auto"
              style={{
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              }}
            >
              {terminalOutput.map((line, index) => (
                <div key={index} className="mb-1 break-words">
                  {line}
                  {index === terminalOutput.length - 1 && isRealSolving && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
              ))}
              {terminalOutput.length === 0 && (
                <div className="text-gray-500">
                  Waiting to start solving...
                  <span className="animate-pulse ml-1">|</span>
                </div>
              )}
            </div>
          </div> */}

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Solver Configuration</h4>
            <div className="space-y-3">
              {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Path
                  </label>
                  <input
                    type="text"
                    value="model.bin"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={confidenceThreshold}
                  onChange={(e) =>
                    setConfidenceThreshold(parseFloat(e.target.value))
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {confidenceThreshold.toFixed(1)} (
                  {confidenceThreshold < 0.7
                    ? "Conservative"
                    : confidenceThreshold > 0.7
                    ? "Aggressive"
                    : "Balanced"}
                  )
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              Solving Progress
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                Status:{" "}
                <span className="font-medium">
                  {isRealSolving ? "Running" : "Ready"}
                </span>
              </div>
              <div>
                Session:{" "}
                <span className="font-mono text-xs">
                  {sessionId?.slice(0, 8) || "None"}
                </span>
              </div>
            </div>
          </div>

          {!loading && !isRealSolving && (
            <button
              onClick={solvePuzzle}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Solving
            </button>
          )}
        </div>
        {/* </div> */}
      </div>
    </div>
  );

  const handleCellClick = (row, col) => {
    setHighlightedCells([[row, col]]);
    setHighlightedClue(null);
  };

  // Solution Page - Real data integration
  const SolutionPage = () => {
    console.log("========== DEBUG: SOLUTION PAGE ==========");
    console.log("solvedData:", solvedData);
    console.log("solvedData.solution:", solvedData?.solution);
    console.log("completion_stats:", solvedData?.solution?.completion_stats);
    console.log("=========================================");
    if (!solvedData?.solution) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading solution...</p>
          </div>
        </div>
      );
    }

    const { solved_board, completion_stats } = solvedData.solution;

    // Convert the solved board for display
    const displayGrid = solved_board || [];

    return (
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Puzzle Solution
          </h2>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className="text-lg text-gray-600">
              {completion_stats?.completion_percentage?.toFixed(1) || 0}%
              Complete
            </span>
          </div>
          <p className="text-gray-600">
            Solved {completion_stats?.solved_cells || 0} of{" "}
            {completion_stats?.total_cells || 0} cells
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Crossword Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              {/* <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Interactive Grid</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setRevealMode(
                        revealMode === "partial" ? "full" : "partial"
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm ${
                      revealMode === "partial"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {revealMode === "partial"
                      ? "Partial Reveal"
                      : "Full Reveal"}
                  </button>
                  <button
                    onClick={() => {
                      setRevealedClues(new Set());
                      setHighlightedCells([]);
                      setHighlightedClue(null);
                    }}
                    className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <RotateCcw size={14} className="inline mr-1" />
                    Reset
                  </button>
                </div>
              </div> */}

              {displayGrid.length > 0 && (
                <div className="overflow-auto">
                  <div className="inline-block border-2 border-gray-800 bg-white">
                    <div
                      className="grid gap-0"
                      style={{
                        gridTemplateColumns: `repeat(${displayGrid[0].length}, minmax(0, 1fr))`,
                      }}
                    >
                      {displayGrid.map((row, rowIndex) =>
                        row.map((cell, colIndex) => {
                          const isHighlighted = highlightedCells.some(
                            ([r, c]) => r === rowIndex && c === colIndex
                          );
                          const isEmpty = !cell || cell === "" || cell === ".";
                          const isBlack = cell === "#" || cell === "*";

                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`
                                w-6 h-6 sm:w-8 sm:h-8 border border-gray-400 flex items-center justify-center text-xs font-bold cursor-pointer
                                ${isBlack ? "bg-black" : "bg-white"}
                                ${
                                  isHighlighted && !isBlack
                                    ? "bg-yellow-200"
                                    : ""
                                }
                                ${!isBlack ? "hover:bg-gray-100" : ""}
                              `}
                              onClick={() =>
                                !isBlack &&
                                handleCellClick &&
                                handleCellClick(rowIndex, colIndex)
                              }
                            >
                              {!isBlack && !isEmpty && (
                                <span className="text-gray-900">{cell}</span>
                              )}
                              {!isBlack && isEmpty && (
                                <span className="text-gray-400">.</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics and Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">
                Solution Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Cells (Excluding Black cells):</span>
                  <span className="font-semibold">
                    {completion_stats?.total_cells || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Solved Cells:</span>
                  <span className="font-semibold text-green-600">
                    {completion_stats?.solved_cells || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Unsolved Cells:</span>
                  <span className="font-semibold text-red-600">
                    {completion_stats?.unsolved_cells || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="font-semibold">
                    {completion_stats?.completion_percentage?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                    style={{
                      width: `${completion_stats?.completion_percentage || 0}%`,
                    }}
                  ></div>
                </div>
                {solvedData.solution.solving_time && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-semibold">
                      {solvedData.solution.solving_time.toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>

              {/* <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                  style={{
                    width: `${completion_stats?.completion_percentage || 0}%`,
                  }}
                ></div>
              </div> */}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setProgress(0);
                    setCurrentPage("home");
                    setSessionId(null);
                    setUploadedImage(null);
                    setGridData(null);
                    setCluesData(null);
                    setSolvedData(null);
                    setValidationData(null);
                    setTerminalOutput([]);
                    setRevealedClues(new Set());
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Solve Another Puzzle
                </button>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(solvedData, null, 2);
                    const dataBlob = new Blob([dataStr], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `crossword-solution-${
                      sessionId?.slice(0, 8) || "puzzle"
                    }.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Download Solution
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Previous Puzzles Page
  const PreviousPuzzlesPage = () => (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Previous Puzzles
        </h2>
        <p className="text-gray-600">Your crossword solving history</p>
      </div>

      <div className="text-center py-12">
        <History className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Previous Puzzles
        </h3>
        <p className="text-gray-600 mb-6">
          You haven't completed any puzzles yet. Start by uploading your first
          crossword!
        </p>
        <button
          onClick={() => setCurrentPage("home")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload New Puzzle
        </button>
      </div>
    </div>
  );

  // Fullscreen Modal
  const FullscreenModal = () => {
    if (!showFullscreen || !uploadedImage) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="relative max-w-full max-h-full bg-white rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">Fullscreen Cropper</h3>
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 max-w-4xl max-h-96 overflow-auto">
            <EnhancedCropper
              image={uploadedImage}
              cropArea={fullscreenCrop || cropCoords}
              onCropChange={(coords) => {
                setFullscreenCrop(coords);
                setCropCoords(coords);
              }}
              onConfirm={(coords) => {
                setCropCoords(coords);
                setShowFullscreen(false);
                setFullscreenCrop(null);
              }}
              title="Fullscreen Crop"
              showOverlay={true}
            />
          </div>
        </div>
      </div>
    );
  };

  // Error display
  const ErrorAlert = () => {
    if (!error) return null;

    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center space-x-2">
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200 font-bold"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <ErrorAlert />

      {currentPage === "home" && <HomePage />}
      {currentPage === "grid-processing" && <GridProcessingPage />}
      {currentPage === "clues-processing" && <CluesProcessingPage />}
      {currentPage === "validation" && <ValidationPage />}
      {currentPage === "xd-creation" && <XDCreationPage />}
      {currentPage === "solving" && <SolvingPage />}
      {currentPage === "solution" && <SolutionPage />}
      {currentPage === "previous" && <PreviousPuzzlesPage />}

      <FullscreenModal />
    </div>
  );
};

export default CrosswordSolver;
