# Step 1: Paper Analysis

Extract structured information from the research paper to guide implementation planning.

## Required Outputs

1. **Paper Intent**: What problem does it solve? (1-2 sentences)
2. **Novelty**: What's new compared to prior work? (1-2 sentences)  
3. **Core Algorithms**: List 2-4 key algorithms/techniques by name
4. **Complexity Assessment**: Simple | Moderate | Complex
5. **Dependencies**: What existing algorithms/models does it build on?

## Analysis Guidelines

- Focus on the abstract and introduction sections
- Identify the main contribution (not all minor contributions)
- Look for "Algorithm X" sections, pseudocode, or mathematical formulations
- Estimate complexity from:
  - Number of stages/steps in the algorithm
  - Hardware requirements mentioned (GPU, TPU, distributed)
  - Dataset size requirements
  - Training time mentioned

## Complexity Scale

**Simple**: Single algorithm, few steps, runs quickly, minimal dependencies
- Example: Basic gradient descent variant, simple heuristic

**Moderate**: Multi-stage pipeline, moderate dependencies, reasonable training time
- Example: Attention mechanism, Q-learning with replay buffer

**Complex**: Distributed training, large models, many components, sophisticated architecture
- Example: Multi-agent systems, large-scale distributed optimization

## Output Format (JSON)

```json
{
  "intent": "Brief problem statement (1-2 sentences)",
  "novelty": "What's new in this paper (1-2 sentences)",
  "core_algorithms": ["Algorithm Name 1", "Algorithm Name 2", "..."],
  "complexity": "Simple | Moderate | Complex",
  "dependencies": ["prerequisite_algorithm_1", "prerequisite_technique_2", "..."]
}
```

## Example

Paper: "Attention Is All You Need" (Transformer)

```json
{
  "intent": "Replace recurrent and convolutional neural networks with a purely attention-based architecture for sequence transduction tasks.",
  "novelty": "Eliminates recurrence entirely, using only self-attention mechanisms and position encodings to model sequence dependencies.",
  "core_algorithms": ["Scaled Dot-Product Attention", "Multi-Head Attention", "Positional Encoding"],
  "complexity": "Moderate",
  "dependencies": ["attention_mechanism", "feedforward_network", "layer_normalization"]
}
```
