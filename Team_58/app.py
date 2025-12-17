from flask import Flask, render_template, request, url_for,Response,jsonify,redirect,current_app
import new_ocean as no
import os
import pandas as pd
import shutil
import cv2
import time
import threading
from llm_feedback import generate_feedback

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

#Global variables
streaming = True
latest_result = {"segment": 0, "score": None, "label": None, "annotated_path": None}
all_segment_results = []  # <-- new list to store all segment results
frame_buffer = []
segment_count = 1

# Global event to signal when a segment has finished processing
segment_ready = threading.Event()  # initially not set (cleared)
processing_lock = threading.Lock() 
final_annotated_path = None
video_source = 0  # default webcam

@app.route('/')
def form():
    return render_template('hire.html')

@app.route('/upload_video', methods=['POST'])
def upload_video():
    global video_source
    file = request.files.get('video_file')

    if not file:
        return jsonify({"error": "No video file uploaded"}), 400

    filename = file.filename
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    video_source = filepath  # use uploaded video instead of webcam
    print(f"📁 Uploaded video selected: {filepath}")

    # ✅ Save it in Flask config so start_processing can find it
    app.config["VIDEO_SOURCE_PATH"] = filepath
    print(f"📁 Uploaded video set as source: {filepath}")
    return jsonify({"status": "uploaded", "path": filepath}), 200


def process_segments(segment_duration=15):
    global frame_buffer, segment_count, latest_result, segment_ready, streaming,all_segment_results

    while streaming:
        time.sleep(segment_duration)  # wait for segment_duration seconds
        if not streaming:
            print("🛑 Processing stopped (thread exiting)")
            break  # ✅ exit loop immediately

        if len(frame_buffer) == 0 or not streaming:
            continue  # skip if no frames

        with processing_lock:
            # Process current buffer as one segment
            print(f"🟢 Processing Segment {segment_count} ({len(frame_buffer)} frames)")
            score, label, annotated_path = no.ocean_average(frame_buffer, segment_count)

            latest_result.update({
                "segment": segment_count,
                "score": score,
                "label": label,
                "annotated_path": annotated_path
            })

            # Store each segment result
            if score is not None and score != 0:
                all_segment_results.append({
                    "segment": segment_count,
                    "score": score,
                    "label": label
                })

            segment_count += 1
            frame_buffer.clear()
            open(r"of_au.csv", "w").close()

            # Notify frontend that a segment is ready
            segment_ready.set()
            print(f"✅ Segment {segment_count-1} ready")


def generate_frames():
    global streaming, video_source, frame_buffer

    print(f"🎥 Starting video stream from: {video_source}")

    camera = cv2.VideoCapture(video_source)
    print("Video runnning", video_source)
    if not camera.isOpened():
        print("❌ Error: Unable to access the camera or video source.")
        blank = cv2.imencode('.jpg', 255 * np.ones((480, 640, 3), np.uint8))[1].tobytes()
        while True:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + blank + b'\r\n')

    while streaming:
        success, frame = camera.read()
        if not success:
            print("⚠️ Frame read failed — maybe video ended or camera disconnected.")

            # If it's a video file → stop and redirect automatically
            if not str(video_source).isdigit():
                print("✅ Uploaded video ended — auto-stop.")
                streaming = False
                camera.release()
                cv2.destroyAllWindows()
                auto_stop_and_redirect()
                return

            time.sleep(0.2)
            continue

        if not streaming:
            break

        frame_buffer.append(frame)
        _, buffer = cv2.imencode('.jpg', frame)

        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    camera.release()
    cv2.destroyAllWindows()
    print("🛑 Stream closed.")


def auto_stop_and_redirect():
    """Auto stop when video file ends and compute summary."""
    global streaming, all_segment_results, final_annotated_path

    streaming = False
    print("⏹ Auto stop triggered (video ended)")
    open(r"of_au.csv", "w").close()

    # Capture final annotated image path
    if latest_result and latest_result.get("annotated_path"):
        final_annotated_path = latest_result["annotated_path"]
        print(f"🖼️ Final annotated image path: {final_annotated_path}")
    else:
        final_annotated_path = None
        print("⚠️ No annotated image found on auto-stop.")

    app.config["FINAL_ANNOTATED_PATH"] = final_annotated_path

    # Directly compute summary once the video finishes
    try:
        df = pd.read_csv(r"segment_results\segment_ocean_hire.csv", skip_blank_lines=True)
        numeric_cols = [
            'openness_level',
            'conscientiousness_level',
            'extraversion_level',
            'agreeableness_level',
            'neuroticism_level',
            'hire_likert'
        ]
        averages = df[numeric_cols].mean().round(2).to_dict()
        final_avg_score = round(df["hire_likert"].mean(), 2)
        final_label = "Confident" if final_avg_score >= 5 else "Not Confident"
        feedback = generate_feedback(final_avg_score, final_label, averages)

        annotated_filename = None
        if final_annotated_path and os.path.exists(final_annotated_path):
            annotated_filename = os.path.basename(final_annotated_path)

        # Save summary data in config
        app.config["SUMMARY_DATA"] = {
            "averages": averages,
            "final_avg_score": final_avg_score,
            "final_label": final_label,
            "annotated_image": annotated_filename,
            "feedback": feedback
        }
        app.config["AUTO_SUMMARY_READY"] = True  # ✅ Add this flag
        print("✅ Auto summary computed successfully")

    except Exception as e:
        print(f"⚠️ Auto summary error: {e}")
        app.config["SUMMARY_DATA"] = None

@app.route('/check_auto_summary')
def check_auto_summary():
    if app.config.get("AUTO_SUMMARY_READY"):
        app.config["AUTO_SUMMARY_READY"] = False  # reset flag
        print("🔍 check_auto_summary called — ready =", True)
        return jsonify({"ready": True})
    print("🔍 check_auto_summary called — ready =", False)
    return jsonify({"ready": False})


@app.route('/get_results')
def get_results():
    global segment_ready, latest_result

    if segment_ready.is_set():
        # Segment is ready → send it and reset event
        segment_ready.clear()
        return jsonify({**latest_result,"status":"ready"})
    else:
        # Segment not ready → return previous segment or "waiting"
        return jsonify({
            "segment": latest_result["segment"],
            "score": "-",
            "label": "-",
            "status": "waiting"
        })

@app.route('/start_processing')
def start_processing():
    global streaming, segment_count, all_segment_results, frame_buffer, video_source

    uploaded_video = app.config.get("VIDEO_SOURCE_PATH")
    if uploaded_video and os.path.exists(uploaded_video):
        video_source = uploaded_video  # use uploaded file
        print(f"🎞️ Using uploaded video: {video_source}")
    else:
        video_source = 0  # fallback to webcam
        print("🎥 Using webcam as video source")

    streaming = True
    segment_count = 1
    frame_buffer.clear()
    all_segment_results.clear()
    open(r"of_au.csv", "w").close()

    # Start background thread if not already running
    if not hasattr(app, "segment_thread") or not app.segment_thread.is_alive():
        app.segment_thread = threading.Thread(target=process_segments, daemon=True)
        app.segment_thread.start()

    return jsonify({"status": "started"}), 200

@app.route('/stop_processing')
def stop_processing():
    global streaming, all_segment_results,final_annotated_path
    streaming = False
    print("⏹ Streaming stopped")
    open(r"of_au.csv", "w").close()

    # Capture final annotated image path
    if latest_result and latest_result.get("annotated_path"):
        final_annotated_path = latest_result["annotated_path"]
        print(f"🖼️ Final annotated image path: {final_annotated_path}")
    else:
        final_annotated_path = None
        print("⚠️ No annotated image found.")

    # Store it in Flask config for use in /summary
    app.config["FINAL_ANNOTATED_PATH"] = final_annotated_path

    return redirect(url_for('summary'))

@app.route('/summary')
def summary():
    cached_summary = app.config.get("SUMMARY_DATA")
    annotated_path = app.config.get("FINAL_ANNOTATED_PATH")

    if cached_summary:
        return render_template("summary.html", **cached_summary)

    try:
        df = pd.read_csv(r"segment_results\segment_ocean_hire.csv", skip_blank_lines=True)

        numeric_cols = [
            'openness_level',
            'conscientiousness_level',
            'extraversion_level',
            'agreeableness_level',
            'neuroticism_level',
            'hire_likert'
        ]

        averages = df[numeric_cols].mean().round(2).to_dict()
        final_avg_score = round(df["hire_likert"].mean(), 2)
        final_label = "Confident" if final_avg_score >= 5 else "Not Confident"

        # 🧠 Generate feedback
        feedback = generate_feedback(final_avg_score, final_label,averages)

        # Extract image filename if exists
        annotated_filename = None
        if annotated_path and os.path.exists(annotated_path):
            annotated_filename = os.path.basename(annotated_path)

        return render_template(
            "summary.html",
            averages=averages,
            final_avg_score=final_avg_score,
            final_label=final_label,
            annotated_image=annotated_filename,
            feedback=feedback
        )

    except Exception as e:
        print("⚠️ Error computing summary:", e)
        return render_template("summary.html",
                               averages={},
                               final_avg_score=None,
                               final_label="No Data Found",
                               annotated_image=None,
                               feedback="No feedback available due to an error."
                               )


@app.route('/video_feed')
def video_feed():
    """Video streaming route."""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/reset_session')
def reset_session():
    global streaming, segment_count, frame_buffer, all_segment_results, latest_result, video_source

    print("🔄 Resetting interview session...")

    # Stop any ongoing streaming or processing
    streaming = False
    time.sleep(0.5)

    # Clear all global data
    segment_count = 1
    frame_buffer.clear()
    all_segment_results.clear()
    latest_result = {"segment": 0, "score": None, "label": None, "annotated_path": None}
    video_source = 0
    app.config.pop("VIDEO_SOURCE_PATH", None)
    app.config.pop("FINAL_ANNOTATED_PATH", None)
    app.config.pop("SUMMARY_DATA", None)
    app.config.pop("AUTO_SUMMARY_READY", None)

    # Remove temporary files if needed
    try:
        if os.path.exists("of_au.csv"):
            open("of_au.csv", "w").close()
        print("🧹 Temporary files cleared.")
    except Exception as e:
        print("⚠️ Cleanup error:", e)

    return redirect(url_for('form'))

if __name__ == '__main__':
    app.run(debug=True)