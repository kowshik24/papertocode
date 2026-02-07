# Step 2: Toy Architecture Design

Design a simplified implementation following the SKILL.md principles.

## Core Principle (from SKILL.md)

**The algorithm does not know it is a toy.**

We preserve:
- Interfaces  
- Control flow
- Decision logic

We simplify:
- Models (tiny networks, mock components)
- Data (synthetic, ~50-100 samples)
- Scale (single machine, CPU only)
- Compute (minutes, not hours)

## Required Outputs

1. **Toy Architecture**: High-level design of the simplified system (3-5 sentences)
2. **Simplification Strategy**: Specific simplifications for each heavy component
3. **Mock Components**: What will be mocked/simplified and how
4. **Expected Behavior**: What qualitative trends should we observe?
5. **Module Breakdown**: Map paper sections to notebook cells

## Design Guidelines

### Starting Point
- Begin with the paper's core algorithm
- Identify the main loop or iterative process
- Preserve the algorithm's decision points

### Heavy Component Identification
Look for components that are:
- Large models (>100MB parameters)
- Require GPUs
- Need large datasets (>10K samples)
- Take hours to train

### Simplification Strategies by Component Type

**Neural Networks**:
- Replace with 1-2 hidden layers, 5-50 units total
- Use simple activation (ReLU, tanh)
- Remove regularization unless core to paper

**Datasets**:
- Generate synthetic data with same properties
- Use 50-200 samples
- Ensure same dimensionality and structure

**Reward/Scoring Models**:
- Replace with rule-based systems
- Use heuristics that capture key properties
- Make scoring transparent/explainable

**Optimizers**:
- Prefer vanilla SGD over Adam/sophisticated optimizers
- Use simple learning rate (constant or step decay)

### Runtime Budget
- Setup + imports: < 30 seconds
- Data generation: < 1 minute
- Training/main algorithm: 2-5 minutes
- Evaluation + plots: < 1 minute
- **Total: ~5-10 minutes on CPU**

## Output Format (JSON)

```json
{
  "toy_architecture": "High-level description of the simplified system (3-5 sentences)",
  "simplification_strategy": {
    "dataset": "How dataset is simplified (e.g., 'Synthetic 2D spiral data, 100 samples')",
    "model": "How model is simplified (e.g., '2-layer network, 10 hidden units')",
    "training": "How training is simplified (e.g., '200 iterations of SGD, lr=0.01')",
    "other_components": "Any other simplifications"
  },
  "mock_components": ["component_1", "component_2", "..."],
  "expected_behavior": "What qualitative trends we should see (e.g., 'Loss decreases over iterations, attention focuses on relevant tokens, model prefers shorter sequences')",
  "module_breakdown": {
    "cells_1-3": "Setup, imports, dataset generation",
    "cells_4-6": "Mock components, baseline",
    "cells_7-10": "Core algorithm implementation",
    "cells_11-15": "Experiments, evaluation, visualization, summary"
  }
}
```

## Example

Paper: "Deep Q-Networks" (DQN for Atari)

```json
{
  "toy_architecture": "Implement Q-learning with experience replay on a simple 5x5 gridworld. Agent learns to navigate from start to goal, avoiding obstacles. Replace neural network with a Q-table (25 states x 4 actions). Use epsilon-greedy exploration and store transitions in a replay buffer of size 100.",
  "simplification_strategy": {
    "dataset": "Synthetic gridworld environment: 5x5 grid, 1 start, 1 goal, 2-3 obstacles",
    "model": "Q-table (25 x 4) instead of neural network DQN",
    "training": "1000 episodes, each max 50 steps, epsilon decay from 1.0 to 0.1",
    "environment": "Deterministic gridworld instead of Atari (no image processing needed)"
  },
  "mock_components": ["gridworld_environment", "replay_buffer", "q_table"],
  "expected_behavior": "Episode rewards increase over time. Agent learns shortest path to goal. Q-values converge. Replay buffer improves stability compared to no replay.",
  "module_breakdown": {
    "cells_1-3": "Setup: imports, gridworld class, visualization helpers",
    "cells_4-6": "Q-table class, replay buffer, epsilon-greedy policy",
    "cells_7-9": "Q-learning update function, training loop",
    "cells_10-12": "Run training, collect metrics",
    "cells_13-15": "Visualize learned policy, Q-values, episode rewards"
  }
}
```

## Red Flags to Avoid

❌ Removing the paper's main loop  
❌ Collapsing multi-step algorithms into one step  
❌ Using production abstractions (classes with 20+ methods)
❌ Requiring external datasets or APIs  
❌ Silent functions with no prints/visualization  
❌ GPU requirements or large model downloads

✅ Pure functions with clear inputs/outputs  
✅ Verbose execution with intermediate prints  
✅ Transparent mock components  
✅ Qualitative validation of paper claims  
✅ Runs in ~5 minutes on CPU
