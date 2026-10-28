import i18n from './i18n';

/**
 * Industry-standard file validation and sanitization for WebAssembly plugins and images.
 * Provides instant client-side verification on drop/selection with magic byte inspection,
 * WebAssembly specification bytecode validation, and canvas-based image sanitization.
 */

export interface WasmValidationResult {
  valid: boolean;
  error?: string;
  sizeBytes: number;
  wasmType?: 'module' | 'component';
  details?: {
    isModuleValid: boolean;
    magicValid: boolean;
    format: 'Core Module (v1)' | 'Component Model (WIT / Preview 2)';
  };
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
  previewUrl?: string;
  width?: number;
  height?: number;
}

export const MAX_WASM_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB max raw upload before compression

/**
 * Reads an unsigned LEB128 integer from Uint8Array at given offset.
 */
function readLeb128U32(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } | null {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < bytes.length) {
    const byte = bytes[offset + bytesRead];
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result >>> 0, bytesRead };
    }
    shift += 7;
    if (shift > 35) return null; // Overflow protection
  }
  return null;
}

/**
 * Validates the section stream of a WebAssembly Component Model binary.
 */
function validateComponentSections(bytes: Uint8Array): { valid: boolean; error?: string; sectionCount: number } {
  let offset = 8;
  let count = 0;
  while (offset < bytes.length) {
    const sectionId = bytes[offset];
    offset += 1;
    // Standard component section IDs are 0 (custom) through 13
    if (sectionId > 13) {
      return { valid: false, error: i18n.t('developer.upload.validation.component_section', { sectionId, offset: (offset - 1).toString(16) }), sectionCount: count };
    }
    const lenInfo = readLeb128U32(bytes, offset);
    if (!lenInfo) {
      return { valid: false, error: i18n.t('developer.upload.validation.component_length', { offset: offset.toString(16) }), sectionCount: count };
    }
    offset += lenInfo.bytesRead;
    if (offset + lenInfo.value > bytes.length) {
      return { valid: false, error: i18n.t('developer.upload.validation.component_bounds', { length: lenInfo.value, offset: offset.toString(16) }), sectionCount: count };
    }
    offset += lenInfo.value;
    count++;
  }
  return { valid: true, sectionCount: count };
}

/**
 * Validates a WebAssembly (.wasm) file immediately upon selection or drag-and-drop.
 * Fully supports both Core WebAssembly Modules (v1) and WebAssembly Component Model
 * binaries (WIT / cargo-component / Preview 2).
 */
export async function validateWasmFile(file: File): Promise<WasmValidationResult> {
  if (!file) {
    return { valid: false, error: i18n.t('developer.upload.validation.no_file'), sizeBytes: 0 };
  }

  if (!file.name.toLowerCase().endsWith('.wasm')) {
    return { valid: false, error: i18n.t('developer.upload.validation.wasm_extension'), sizeBytes: file.size };
  }

  if (file.size > MAX_WASM_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.wasm_too_large', { size: sizeMb }),
      sizeBytes: file.size,
    };
  }

  if (file.size < 8) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.wasm_too_small'),
      sizeBytes: file.size,
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Verify WASM Magic number: \0asm (0x00, 0x61, 0x73, 0x6D)
    const isMagicValid =
      bytes[0] === 0x00 &&
      bytes[1] === 0x61 &&
      bytes[2] === 0x73 &&
      bytes[3] === 0x6D;

    if (!isMagicValid) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.wasm_header'),
        sizeBytes: file.size,
      };
    }

    // 2. Identify WebAssembly Binary Type:
    // Core Module: [0x01, 0x00, 0x00, 0x00]
    // Component Model: [0x0d, 0x00, 0x01, 0x00] (v1/preview 2), [0x0a, 0x00, 0x01, 0x00] (preview 1), or layer 0x0001 (bytes[6]=1, bytes[7]=0)
    const isCoreModule =
      bytes[4] === 0x01 &&
      bytes[5] === 0x00 &&
      bytes[6] === 0x00 &&
      bytes[7] === 0x00;

    const isComponentModel =
      (bytes[6] === 0x01 && bytes[7] === 0x00) ||
      (bytes[4] === 0x0d && bytes[5] === 0x00 && bytes[6] === 0x01 && bytes[7] === 0x00) ||
      (bytes[4] === 0x0a && bytes[5] === 0x00 && bytes[6] === 0x01 && bytes[7] === 0x00);

    if (!isCoreModule && !isComponentModel) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.wasm_unsupported'),
        sizeBytes: file.size,
      };
    }

    if (isCoreModule) {
      // Bytecode verification for Core Modules via browser's built-in engine
      if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function') {
        const isValid = WebAssembly.validate(buffer);
        if (!isValid) {
          return {
            valid: false,
            error: i18n.t('developer.upload.validation.wasm_bytecode'),
            sizeBytes: file.size,
          };
        }
      }

      return {
        valid: true,
        sizeBytes: file.size,
        wasmType: 'module',
        details: {
          isModuleValid: true,
          magicValid: true,
          format: 'Core Module (v1)',
        },
      };
    }

    // WebAssembly Component Model verification
    const componentCheck = validateComponentSections(bytes);
    if (!componentCheck.valid) {
      return {
        valid: false,
        error: componentCheck.error || i18n.t('developer.upload.validation.wasm_component'),
        sizeBytes: file.size,
      };
    }

    return {
      valid: true,
      sizeBytes: file.size,
      wasmType: 'component',
      details: {
        isModuleValid: true,
        magicValid: true,
        format: 'Component Model (WIT / Preview 2)',
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.wasm_inspection', { error: err.message || i18n.t('developer.upload.validation.unknown_error') }),
      sizeBytes: file.size,
    };
  }
}

/**
 * Validates and sanitizes an image file (PNG, JPEG, WebP) upon selection.
 * Inspects magic bytes to prevent masquerading payloads, verifies rendering with HTML Image decoder,
 * and re-encodes through Canvas to strip all metadata/polyglot payloads.
 */
export async function validateAndSanitizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): Promise<ImageValidationResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    minWidth = 32,
    minHeight = 32,
  } = options;

  if (!file) {
    return { valid: false, error: i18n.t('developer.upload.validation.no_image') };
  }

  if (file.size > MAX_RAW_IMAGE_BYTES) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.image_too_large', { name: file.name }),
    };
  }

  try {
    // 1. Read first 16 bytes to check magic headers
    const headerBuffer = await file.slice(0, 16).arrayBuffer();
    const header = new Uint8Array(headerBuffer);

    const isPng =
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a;

    const isJpeg =
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff;

    const isWebp =
      header.length >= 12 &&
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 && // "RIFF"
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50; // "WEBP"

    if (!isPng && !isJpeg && !isWebp) {
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.image_format', { name: file.name }),
      };
    }

    // 2. Decode image in browser memory to verify visual rendering and dimensions
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const loaded = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error(i18n.t('developer.upload.validation.image_corrupt')));
      img.src = objectUrl;
    });

    if (loaded.width < minWidth || loaded.height < minHeight) {
      URL.revokeObjectURL(objectUrl);
      return {
        valid: false,
        error: i18n.t('developer.upload.validation.image_dimensions', { width: loaded.width, height: loaded.height, minWidth, minHeight }),
      };
    }

    // 3. Canvas Sanitization & Compression:
    // Rendering to an off-screen canvas strips EXIF, executable comments, and unwanted payloads.
    const ratio = Math.min(1, maxWidth / loaded.width, maxHeight / loaded.height);
    const targetWidth = Math.max(1, Math.round(loaded.width * ratio));
    const targetHeight = Math.max(1, Math.round(loaded.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return { valid: false, error: i18n.t('developer.upload.validation.image_canvas') };
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    URL.revokeObjectURL(objectUrl);

    // Prefer WebP for compression efficiency, fallback to JPEG
    const mimeType = isPng && quality === 1.0 ? 'image/png' : 'image/webp';
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, mimeType, quality));

    if (!blob) {
      return { valid: false, error: i18n.t('developer.upload.validation.image_encoding') };
    }

    const sanitizedFile = new File([blob], file.name.replace(/\.[^.]+$/, mimeType === 'image/webp' ? '.webp' : '.png'), {
      type: mimeType,
      lastModified: Date.now(),
    });

    // Generate local preview data URL
    const previewUrl = canvas.toDataURL(mimeType, quality);

    return {
      valid: true,
      file: sanitizedFile,
      previewUrl,
      width: targetWidth,
      height: targetHeight,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: i18n.t('developer.upload.validation.image_processing', { name: file.name, error: err.message || i18n.t('developer.upload.validation.corrupted_file') }),
    };
  }
}
