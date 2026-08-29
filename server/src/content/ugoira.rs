use crate::api::error::{ApiError, ApiResult};
use serde::Deserialize;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

/// Minimal ugoira manifest format.
#[derive(Deserialize)]
pub struct UgoiraManifest {
    pub frames: Vec<UgoiraFrame>,
}

#[derive(Deserialize)]
pub struct UgoiraFrame {
    pub file: String,
    /// Frame display duration in milliseconds.
    pub delay: u32,
}

/// Reads and deserializes `animation.json` from a ugoira ZIP archive.
pub fn read_manifest(archive: &mut zip::ZipArchive<BufReader<File>>) -> ApiResult<UgoiraManifest> {
    let mut entry = archive
        .by_name("animation.json")
        .map_err(|_| ApiError::MissingUgoiraManifest)?;
    let mut buf = String::new();
    entry.read_to_string(&mut buf)?;
    serde_json::from_str(&buf).map_err(|e| ApiError::InvalidUgoiraManifest(e.to_string()))
}

/// Validates a ugoira ZIP file:
/// - `animation.json` must exist, deserialize cleanly, and have a non-empty `frames` array
/// - every `frame.delay` must be > 0
/// - every `frame.file` must exist as an entry inside the ZIP
pub fn validate(path: &Path) -> ApiResult<()> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(BufReader::new(file)).map_err(|e| ApiError::ZipError(e.into()))?;

    let manifest = read_manifest(&mut archive)?;

    if manifest.frames.is_empty() {
        return Err(ApiError::MissingUgoiraManifest);
    }

    // Collect archive entries (excluding animation.json itself)
    let mut archive_files = std::collections::HashSet::new();
    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            let name = entry.name().to_owned();
            if name != "animation.json" {
                archive_files.insert(name);
            }
        }
    }

    for (i, frame) in manifest.frames.iter().enumerate() {
        if frame.delay == 0 {
            return Err(ApiError::InvalidUgoiraManifest(format!("frames[{i}].delay is zero")));
        }
        if !archive_files.contains(&frame.file) {
            return Err(ApiError::InvalidUgoiraManifest(format!(
                "frames[{i}].file '{}' not found in ZIP",
                frame.file
            )));
        }
    }

    Ok(())
}
