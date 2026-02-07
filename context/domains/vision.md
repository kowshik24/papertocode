# Domain: Computer Vision & Perception

Guidance for papers focused on image processing, convolutional networks, object detection, and visual recognition.

## Common Paper Types

- Convolutional architectures (ResNet, VGG, etc.)
- Object detection and segmentation
- Image classification methods
- Feature extraction and representation learning
- Data augmentation techniques
- Self-supervised visual learning

## Domain-Specific Toy Simplifications

### Image Data
- **Image size**: 8x8 to 28x28 pixels (not 224x224!)
- **Channels**: 1 (grayscale) or 3 (RGB)
- **Dataset size**: 50-200 images
- **Classes**: 2-5 classes max
- **Generation**: Synthetic shapes, MNIST subset, or simple patterns

```python
# Example: Generate synthetic image data
def generate_toy_images(n_samples=100, img_size=16):
    """Generate images with simple shapes"""
    images, labels = [], []
    for i in range(n_samples):
        img = np.zeros((img_size, img_size))
        if i % 2 == 0:
            # Circle
            center = img_size // 2
            for x in range(img_size):
                for y in range(img_size):
                    if (x - center)**2 + (y - center)**2 < (img_size//3)**2:
                        img[x, y] = 1.0
            labels.append(0)
        else:
            # Square
            margin = img_size // 4
            img[margin:-margin, margin:-margin] = 1.0
            labels.append(1)
        images.append(img)
    return np.array(images), np.array(labels)
```

### Models (CNNs)
- **Convolutional layers**: 1-3 layers max
- **Filters**: 4-16 filters per layer (not 64-512!)
- **Kernel size**: 3x3 or 5x5
- **Pooling**: 2x2 max pooling if needed
- **Fully connected**: 1 hidden layer, 10-20 units
- **Total parameters**: < 5000

```python
# Example: Tiny CNN structure
conv1: 1 channel → 8 filters, 3x3 kernel → 8x14x14 (if input is 16x16)
pool1: 2x2 max pool → 8x7x7  
conv2: 8 → 16 filters, 3x3 kernel → 16x5x5
flatten → 400 units
fc: 400 → 10 → 2 classes
```

### Training
- **Epochs**: 10-30
- **Batch size**: 16-32
- **Optimizer**: SGD with momentum (lr=0.01, momentum=0.9)
- **Time budget**: 3-5 minutes max

## Key Visualization Patterns

1. **Sample images**: Show 16-25 images in grid (original and augmented)
2. **Learned filters**: Visualize first conv layer filters (as images)
3. **Feature maps**: Show intermediate activations for one sample
4. **Training curves**: Loss and accuracy over epochs
5. **Predictions**: Show images with predicted vs. true labels
6. **Confusion matrix**: If multi-class classification

## Example Implementations

### Example 1: Simple Convolution

```python
def convolve2d(image, kernel):
    """
    image: (H, W)
    kernel: (K, K)
    Returns: (H-K+1, W-K+1)
    """
    H, W = image.shape
    K = kernel.shape[0]
    output = np.zeros((H - K + 1, W - K + 1))
    
    for i in range(H - K + 1):
        for j in range(W - K + 1):
            patch = image[i:i+K, j:j+K]
            output[i, j] = np.sum(patch * kernel)
    
    return output
```

### Example 2: Max Pooling

```python
def max_pool2d(feature_map, pool_size=2):
    """
    feature_map: (H, W)
    Returns: (H//pool_size, W//pool_size)
    """
    H, W = feature_map.shape
    out_h, out_w = H // pool_size, W // pool_size
    output = np.zeros((out_h, out_w))
    
    for i in range(out_h):
        for j in range(out_w):
            patch = feature_map[i*pool_size:(i+1)*pool_size, 
                               j*pool_size:(j+1)*pool_size]
            output[i, j] = np.max(patch)
    
    return output
```

### Example 3: Residual Connection (for ResNet-style papers)

```python
def residual_block(x, conv_layer):
    """
    x: input feature map
    conv_layer: function that applies conv + activation
    """
    identity = x  # Skip connection
    
    out = conv_layer(x)
    out = relu(out)
    out = conv_layer(out)
    
    # Add skip connection
    out = out + identity  # Requires same dimensions
    out = relu(out)
    
    return out
```

## Mock Components

### Edge Detector (for low-level vision papers)
```python
def edge_detector(image):
    """Simple edge detection using Sobel-like kernel"""
    kernel_x = np.array([[-1, 0, 1],
                         [-2, 0, 2],
                         [-1, 0, 1]])
    kernel_y = kernel_x.T
    
    edges_x = convolve2d(image, kernel_x)
    edges_y = convolve2d(image, kernel_y)
    
    edges = np.sqrt(edges_x**2 + edges_y**2)
    return edges
```

### Data Augmentation
```python
def augment_image(image):
    """Simple augmentations"""
    # Random flip
    if np.random.rand() > 0.5:
        image = np.fliplr(image)
    
    # Random rotation (90, 180, 270)
    k = np.random.randint(0, 4)
    image = np.rot90(image, k)
    
    # Add small noise
    noise = np.random.randn(*image.shape) * 0.1
    image = image + noise
    
    return np.clip(image, 0, 1)
```

## Common Pitfalls in This Domain

❌ **Real ImageNet images**: Use synthetic or tiny datasets  
❌ **Large images**: Keep ≤ 28x28 (MNIST size) unless essential  
❌ **Deep networks**: 1-3 conv layers is enough  
❌ **Many filters**: 4-16 filters per layer max  
❌ **GPU requirements**: Everything should run on CPU  
❌ **External downloads**: Don't download pretrained weights  

✅ **Synthetic data**: Shapes, patterns, noise  
✅ **Visualize filters**: Show what conv layers learn  
✅ **Show feature maps**: Make representations visible  
✅ **Small batches**: 16-32 images  
✅ **Fast training**: 3-5 minutes max  

## Qualitative Validation

The toy implementation should demonstrate:
- **Feature learning**: Conv filters learn meaningful patterns (edges, corners)
- **Classification accuracy**: > random chance, shows learning
- **Architecture benefit**: If paper proposes new architecture, it should outperform baseline
- **Training dynamics**: Loss decreases smoothly, accuracy improves
- **Visual outputs**: Predictions make intuitive sense

## Specific Guidance

### For CNN Architecture Papers
- Implement baseline (simple CNN) + paper's architecture
- Show both have similar parameter counts (fair comparison)
- Compare accuracy and training speed

### For Object Detection Papers
- Simplify to bounding box on single object
- Use intersection-over-union (IoU) metric
- Show detections visualized on images

### For Feature Learning Papers
- Visualize learned features (t-SNE, PCA)
- Show feature similarity/clustering
- Demonstrate feature quality on downstream task

### For Data Augmentation Papers
- Show before/after augmentation examples
- Train with and without augmentation
- Compare generalization (train vs. val accuracy)
