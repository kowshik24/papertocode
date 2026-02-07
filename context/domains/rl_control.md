# Domain: Reinforcement Learning & Control

Guidance for papers focused on RL algorithms, policy learning, value functions, and control methods.

## Common Paper Types

- Value-based methods (Q-learning, DQN variants)
- Policy gradient methods (REINFORCE, PPO, A3C)
- Actor-critic algorithms
- Multi-agent RL
- Exploration strategies
- Reward shaping and inverse RL

## Domain-Specific Toy Simplifications

### Environments
- **State space**: Discrete, 10-100 states (gridworld, chain, simple MDP)
- **Action space**: Discrete, 2-5 actions
- **Episode length**: 10-50 steps max
- **Avoid**: Continuous control, high-dimensional states, image observations

```python
# Example: 5x5 Gridworld
class SimpleGridWorld:
    def __init__(self, size=5):
        self.size = size
        self.start = (0, 0)
        self.goal = (size-1, size-1)
        self.obstacles = [(2, 2), (2, 3)]
        
    def reset(self):
        self.state = self.start
        return self.state
    
    def step(self, action):
        # action: 0=up, 1=right, 2=down, 3=left
        # Returns: next_state, reward, done
        pass
```

### Agents/Policies
- **Q-table**: For discrete states (state x action)
- **Linear function approximation**: If continuous features
- **Tiny neural network**: 1-2 layers, 10-20 units total (avoid if possible)
- **Policy**: Softmax over action logits, or epsilon-greedy

### Training
- **Episodes**: 100-1000 episodes
- **Steps per episode**: 10-50
- **Total environment steps**: < 50,000
- **Time budget**: 2-5 minutes max

### Hyperparameters
- **Learning rate (α)**: 0.01 - 0.1
- **Discount factor (γ)**: 0.9 - 0.99
- **Exploration (ε)**: Start 1.0, decay to 0.1
- **Replay buffer**: 100-1000 transitions (if used)

## Key Visualization Patterns

1. **Episode rewards**: Reward per episode over training
2. **Value function heatmap**: For gridworld, show V(s) as heatmap
3. **Policy visualization**: Show action probabilities or deterministic policy
4. **Exploration rate**: ε or entropy over time
5. **Q-values**: Show Q(s,a) for selected states
6. **Sample trajectories**: Visualize agent's path before/after training

## Example Implementations

### Example 1: Q-Learning Update

```python
def q_learning_update(Q, state, action, reward, next_state, alpha=0.1, gamma=0.9):
    """
    Q: Q-table (dict or array)
    Returns: updated Q-table
    """
    # Current Q-value
    current_q = Q[state, action]
    
    # Max Q-value for next state
    max_next_q = np.max(Q[next_state, :])
    
    # TD target
    target = reward + gamma * max_next_q
    
    # TD error
    td_error = target - current_q
    
    # Update
    Q[state, action] = current_q + alpha * td_error
    
    return Q
```

### Example 2: Epsilon-Greedy Policy

```python
def epsilon_greedy(Q, state, epsilon=0.1, num_actions=4):
    """Select action using epsilon-greedy policy"""
    if np.random.rand() < epsilon:
        # Explore: random action
        return np.random.randint(num_actions)
    else:
        # Exploit: best action
        return np.argmax(Q[state, :])
```

### Example 3: Experience Replay

```python
class ReplayBuffer:
    def __init__(self, capacity=1000):
        self.buffer = []
        self.capacity = capacity
    
    def add(self, state, action, reward, next_state, done):
        if len(self.buffer) >= self.capacity:
            self.buffer.pop(0)  # Remove oldest
        self.buffer.append((state, action, reward, next_state, done))
    
    def sample(self, batch_size=32):
        indices = np.random.choice(len(self.buffer), batch_size, replace=False)
        return [self.buffer[i] for i in indices]
```

### Example 4: Policy Gradient (REINFORCE)

```python
def reinforce_update(policy_net, episode_states, episode_actions, 
                    episode_rewards, gamma=0.99, lr=0.01):
    """
    Simplified REINFORCE update
    policy_net: simple function approximator
    """
    # Compute returns (discounted cumulative rewards)
    returns = []
    G = 0
    for r in reversed(episode_rewards):
        G = r + gamma * G
        returns.insert(0, G)
    returns = np.array(returns)
    
    # Update policy in direction of high-return actions
    for state, action, G in zip(episode_states, episode_actions, returns):
        # Compute gradient and update (simplified)
        policy_net.update(state, action, G, lr)
    
    return policy_net
```

## Mock Components

### Simple MDP Environment
```python
class ChainMDP:
    """Linear chain: [S] -> [S] -> [S] -> [G]"""
    def __init__(self, length=5):
        self.length = length
        self.state = 0
    
    def reset(self):
        self.state = 0
        return self.state
    
    def step(self, action):
        # action: 0=left, 1=right
        if action == 1 and self.state < self.length - 1:
            self.state += 1
        elif action == 0 and self.state > 0:
            self.state -= 1
        
        reward = 1.0 if self.state == self.length - 1 else 0.0
        done = self.state == self.length - 1
        
        return self.state, reward, done
```

### Reward Function (for inverse RL papers)
```python
def reward_function(state, action, next_state):
    """
    Rule-based reward for demonstration
    Replace this with learned reward for inverse RL
    """
    # Distance to goal
    goal = (4, 4)
    dist_current = abs(state[0] - goal[0]) + abs(state[1] - goal[1])
    dist_next = abs(next_state[0] - goal[0]) + abs(next_state[1] - goal[1])
    
    # Reward for getting closer
    reward = dist_current - dist_next
    
    # Bonus for reaching goal
    if next_state == goal:
        reward += 10
    
    return reward
```

## Common Pitfalls in This Domain

❌ **Atari/continuous control**: Use discrete, small state spaces  
❌ **Deep RL**: Avoid neural networks if Q-table works  
❌ **Long episodes**: Keep < 50 steps per episode  
❌ **Million timesteps**: Train for 10K-50K steps max  
❌ **Parallel environments**: Single environment is enough  
❌ **Sophisticated algorithms**: Vanilla Q-learning often sufficient  

✅ **Gridworld/toy MDPs**: Perfect for RL papers  
✅ **Tabular methods**: Q-table when state space is small  
✅ **Clear rewards**: Make reward function transparent/printable  
✅ **Visualize policy**: Show learned behavior explicitly  
✅ **Compare to baseline**: Random policy or vanilla Q-learning  

## Qualitative Validation

The toy implementation should demonstrate:
- **Learning**: Episode rewards increase over training
- **Convergence**: Q-values or policy stabilize
- **Optimal behavior**: Agent reaches goal via shortest path (if applicable)
- **Relative improvements**: Paper's method outperforms baseline
- **Exploration-exploitation**: Show tradeoff (e.g., ε-decay)

## Specific Guidance

### For Value-Based Methods (DQN, etc.)
- Use Q-table for small state spaces
- Show Q-value evolution over training
- Visualize learned value function as heatmap
- Compare with/without experience replay (if that's the contribution)

### For Policy Gradient Methods (REINFORCE, PPO)
- Use softmax policy (discrete actions)
- Show policy entropy over training (exploration)
- Plot episode returns (not just rewards)
- Demonstrate variance reduction if that's the claim

### For Actor-Critic Methods
- Separate value function and policy
- Show critic's value estimates
- Compare to pure policy gradient baseline

### For Multi-Agent RL
- 2 agents max (not 10+)
- Simple game (e.g., coordination, competition)
- Show emergent behavior (cooperation, specialization)

### For Exploration Papers
- Compare exploration strategies explicitly
- Track state visit counts (coverage)
- Show exploration bonus or intrinsic rewards
- Demonstrate improved sample efficiency

## Environment Suggestions by Complexity

**Simple**: 
- Chain MDP (1D)
- Small gridworld (5x5, 10x10)
- Bandit problems

**Moderate**:
- Gridworld with obstacles
- Windy gridworld (stochastic transitions)
- Simple game (tic-tac-toe, connect-4 on 3x3 board)

**Complex** (avoid unless core to paper):
- Continuous control
- Image observations
- Large state/action spaces
