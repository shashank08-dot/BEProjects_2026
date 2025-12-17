import cv2
import numpy as np
from sklearn.cluster import KMeans
import os
import subprocess
import time
import pandas as pd
import ocean
from annotate import annotate_image

def ocean_average(frame_buffer,segment_count):
    # ---------------------- Key Frame Extraction ----------------------
    def extract_key_frames_from_buffer(frames_buffer, k=5):
       
        if len(frames_buffer) == 0:
            return []

        features = []
        for f in frames_buffer:
            f_resized = cv2.resize(f, (224, 224))
            hist = cv2.calcHist([f_resized], [0,1,2], None, [8,8,8], [0,256,0,256,0,256])
            features.append(cv2.normalize(hist, hist).flatten())
        features = np.array(features)

        k = min(k, len(frames_buffer))
        kmeans = KMeans(n_clusters=k, random_state=42).fit(features)
        labels = kmeans.labels_

        key_frames_with_indices = []
        for cluster in range(k):
            indices = np.where(labels == cluster)[0]
            center = kmeans.cluster_centers_[cluster]
            distances = [np.linalg.norm(features[i] - center) for i in indices]
            best_index = indices[np.argmin(distances)]
            key_frames_with_indices.append((best_index, frames_buffer[best_index]))

        key_frames_with_indices.sort(key=lambda x: x[0])
        return key_frames_with_indices

    # ---------------------- Run OpenFace ----------------------
    def run_openface_on_frame(openface_exe, frame_path):
        frame_dir = os.path.dirname(frame_path)
        subprocess.run([
            openface_exe,
            "-f", frame_path,
            "-out_dir", frame_dir,
            "-2Dfp", "-3Dfp", "-pdm_params", "-pose", "-gaze", "-aus", "-tracked"
        ])
        csv_path = os.path.splitext(frame_path)[0] + ".csv"
        if os.path.exists(csv_path):
            return csv_path
        return None

    openface_exe = r"C:\Users\mmm\Downloads\OpenFace_2.2.0_win_x64\FeatureExtraction.exe"
    final_csv = r"of_au.csv"
    temp_frame_folder = r"temp_frames"
    os.makedirs(temp_frame_folder, exist_ok=True)

    header_written = False
    header_written = False
    header_segment = False
    if frame_buffer:
        print(f"There are {len(frame_buffer)} frames in the buffer.")
    else:
         return 0, "No Data", None

    key_frames_with_indices = extract_key_frames_from_buffer(frame_buffer, k=5)

    for idx_in_buffer, kf in key_frames_with_indices:
        frame_name = f"frame_seg{segment_count}-f{idx_in_buffer+1}.jpg"
        frame_path = os.path.join(temp_frame_folder, frame_name)
        cv2.imwrite(frame_path, kf)

        csv_path = run_openface_on_frame(openface_exe, frame_path)
        if csv_path:
            df = pd.read_csv(csv_path, skip_blank_lines=True)
            df['frame_id'] = f"seg{segment_count}-f{idx_in_buffer+1}"
            df.to_csv(final_csv, mode='a', header=not header_written, index=False)
            header_written = True
            os.remove(csv_path)

    # Wait for OCEAN computation for this segment
    print("🧠 Computing hire Likert scores for this segment...")
    start_compute = time.time()
    df_scores = ocean.ocean_to_hire(final_csv, segment_count)
    df_segment = df_scores[df_scores["Segment_ID"] == segment_count]
    compute_time = time.time() - start_compute
    print(f"✅ Hire Likert computed in {compute_time:.2f} seconds")
    segment_output_folder = "segment_results"
    os.makedirs(segment_output_folder, exist_ok=True)
    combined_csv_path = os.path.join(segment_output_folder, "segment_ocean_hire.csv")

    # -----------------------------
    # Filter only required columns
    # -----------------------------
    required_columns = [
        "openness_level", "conscientiousness_level", "extraversion_level",
        "agreeableness_level", "neuroticism_level", "hire_likert"
    ]

    # Keep only relevant columns (ignore missing ones safely)
    available_columns = [c for c in required_columns if c in df_scores.columns]
    df_selected = df_scores[available_columns].copy()

    # Add Segment_ID column
    df_selected["Segment_ID"] = segment_count

    #calculate averages
    summary = {}
    for col in required_columns:
        summary[col] = df_segment[col].mean()

    # Add identifiers and metadata
    summary["Segment_ID"] = segment_count
    summary["Compute_Time_sec"] = round(compute_time, 2)

    # Convert to DataFrame
    df_summary = pd.DataFrame([summary])
    df_selected = df_summary


    # -----------------------------
    # Append or create CSV
    # -----------------------------
    if not os.path.exists(combined_csv_path):
        # Create new CSV with headers
        df_selected.to_csv(combined_csv_path, index=False)
        print(f"📄 Created new master CSV: {combined_csv_path}")
    else:
        # Append to existing CSV (headers)
        header_segment = (not os.path.exists(combined_csv_path)) or (os.stat(combined_csv_path).st_size < 5)
        df_selected.to_csv(combined_csv_path, mode='a', header=header_segment, index=False)
        print(f"📄 Appended results for Segment {segment_count} to {combined_csv_path}")
    # -----------------------------


    # Annotate last key frame of segment
    last_frame_id = f"seg{segment_count}-f{key_frames_with_indices[-1][0]+1}"
    frame_path = os.path.join(temp_frame_folder, f"frame_{last_frame_id}.jpg")
    if os.path.exists(frame_path):
        try:
            annotated = annotate_image(frame_path, df_scores)
            # Save annotated image in temp_frames folder
            annotated_path = os.path.join(temp_frame_folder, f"annotated_image{segment_count}.jpg")

            cv2.imwrite(annotated_path, annotated)
            
            output_dir = os.path.join("static", "results")
            os.makedirs(output_dir, exist_ok=True)

            new_annotated_path = os.path.join(output_dir, f"annotated_image{segment_count}.jpg")
            cv2.imwrite(new_annotated_path, annotated)

            # compute final hire likert
            if "hire_likert" in df_scores.columns and not df_scores["hire_likert"].empty:
                final_score = df_scores["hire_likert"].iloc[-1]
            else:
                final_score = 0

            label = "Confident" if final_score >= 3 else "Needs Improvement"

            # Return all relevant results to Flask
            open(r"of_au.csv", "w").close()
            return round(final_score, 2), label, new_annotated_path

        except Exception as e:
            print("❌ Annotation error:", e)
        
        
    header_written = False
    return 0, "No Data", None