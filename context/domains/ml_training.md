# Domain: ML Training & Optimization

Guidance for papers focused on training algorithms, optimization methods, and learning dynamics.

## Common Paper Types

- SGD variants (momentum, Nesterov, adaptive learning rates)
- Optimization algorithms (Adam, RMSprop, second-order methods)
- Learning rate schedules
- Loss functions and regularization
- Batch normalization and training stability
- Convergence analysis

## Domain-Specific Toy Simplifications

### Datasets
- **2D toy problems**: Spirals, moons, circles for classification
- **Small tabular**: 50-200 samples, 2-10 features
- **Avoid**: Image datasets (unless core to paper), NLP corpora

```python
# Example: Generate 2D classification data
from sklearn.datasets import make_moons, make_circles, make_classification
X, y = make_moons(n_samples=100, noise=0.1, random_state=42)
```

### Models
- **Single hidden layer**: 5-20 units
- **Two hidden layers max**: [10, 5] or [20, 10]
- **Total parameters**: < 1000
- **Avoid**: Deep networks, pretrained models, transformers

### Training
- **Iterations**: 100-500 for simple tasks, up to 2000 for more complex
- **Batch size**: 16-32 (full dataset if < 200 samples)
- **Epochs**: 10-50
- **Time budget**: 2-3 minutes max

### Metrics to Track
- Loss per iteration (primary)
- Training accuracy
- Gradient norms (if relevant to paper)
- Learning rate over time (if schedule used)

## Key Visualization Patterns

1. **Loss curves**: Loss vs. iteration (log scale if needed)
2. **Decision boundaries**: For 2D classification, show how boundary evolves
3. **Gradient statistics**: Norm, variance across layers/iterations
4. **Learning rate schedule**: If using schedule, plot LR over time
5. **Comparison plots**: Baseline vs. paper's method

## Example Implementations

### Example 1: SGD with Momentum

```python
def sgd_with_momentum(params, grads, velocity, lr=0.01, momentum=0.9):
    """SGD with momentum update rule"""
    velocity = momentum * velocity - lr * grads
    params = params + velocity
    return params, velocity
```

### Example 2: Simple Neural Network Training Loop

```python
for epoch in range(num_epochs):
    for batch_x, batch_y in batches:
        # Forward pass
        predictions = model(batch_x)
        loss = compute_loss(predictions, batch_y)
        
        # Backward pass
        grads = compute_gradients(loss)
        
        # Update
        params = optimizer_step(params, grads)
        
        # Log progress
        if step % 10 == 0:
            print(f"Epoch {epoch}, Step {step}, Loss: {loss:.4f}")
```

## Mock Components

### Optimizer
Replace sophisticated optimizers with simple update rules:
```python
class ToyOptimizer:
    def __init__(self, lr=0.01):
        self.lr = lr
    
    def step(self, params, grads):
        return params - self.lr * grads  # Simple gradient descent
```

### Learning Rate Scheduler
```python
def step_decay(initial_lr, epoch, drop_every=10, drop_rate=0.5):
    return initial_lr * (drop_rate ** (epoch // drop_every))
```

## Common Pitfalls in This Domain

❌ **Training too long**: Keep to 2-3 minutes max  
❌ **Too many hyperparameters**: Focus on 1-2 key params  
❌ **Complex architectures**: Single hidden layer is usually enough  
❌ **Noisy plots**: Average over 3-5 runs, smooth curves  

✅ **Clear loss progression**: Should see clear decrease  
✅ **Reproducible**: Set random seeds  
✅ **Comparative**: Always include baseline (vanilla SGD)  
✅ **Interpretable**: Print and plot key metrics

## Qualitative Validation

The toy implementation should demonstrate:
- **Convergence**: Loss decreases over iterations
- **Relative improvements**: Paper's method converges faster/better than baseline
- **Failure modes**: Show when method struggles (if discussed in paper)
- **Hyperparameter sensitivity**: If paper claims robustness, show it
