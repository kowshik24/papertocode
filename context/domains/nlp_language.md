# Domain: NLP & Language Models

Guidance for papers focused on natural language processing, transformers, attention, and language understanding.

## Common Paper Types

- Attention mechanisms (self-attention, cross-attention)
- Transformer architectures and variants
- Tokenization and embeddings
- Sequence-to-sequence models
- Language model pretraining methods
- Text generation and decoding strategies

## Domain-Specific Toy Simplifications

### Text Data
- **Vocabulary size**: 100-500 words (real words from small corpus)
- **Sequence length**: 5-20 tokens max
- **Dataset size**: 50-200 sequences
- **Use case**: Simple task (sentiment, next-word prediction, toy translation)

```python
# Example: Create tiny corpus
corpus = [
    "the cat sat on the mat",
    "the dog played in the park", 
    "a bird flew over the tree",
    # ... 50-100 more simple sentences
]
```

### Embeddings
- **Embedding dimension**: 8-32 (not 768!)
- **Initialize**: Random or use tiny GloVe subset
- **Vocabulary**: Character-level or word-level (< 500 tokens)

```python
# Example: Simple word embeddings
vocab_size = 200
embed_dim = 16
embeddings = np.random.randn(vocab_size, embed_dim) * 0.1
```

### Models
- **Attention heads**: 1-2 (not 12!)
- **Layers**: 1-2 transformer layers max
- **Hidden dim**: 16-64
- **FFN expansion**: 2x (not 4x)
- **Parameters**: < 5000 total

### Training
- **Sequences**: 100-500 training examples
- **Batch size**: 8-16
- **Steps**: 200-1000
- **Time budget**: 3-5 minutes max

## Key Visualization Patterns

1. **Attention heatmaps**: token x token attention weights
2. **Embedding projections**: 2D PCA/t-SNE of word embeddings
3. **Token probabilities**: Bar chart of top-k predicted tokens
4. **Loss curves**: Cross-entropy loss over training steps
5. **Generation examples**: Show input → output sequences

## Example Implementations

### Example 1: Scaled Dot-Product Attention

```python
def scaled_dot_product_attention(Q, K, V):
    """
    Q, K, V: (seq_len, dim)
    Returns: (seq_len, dim), attention_weights
    """
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)  # (seq_len, seq_len)
    attention_weights = softmax(scores, axis=-1)
    output = attention_weights @ V  # (seq_len, dim)
    return output, attention_weights
```

### Example 2: Simple Tokenizer

```python
class SimpleTokenizer:
    def __init__(self, vocab):
        self.vocab = vocab  # list of words
        self.word_to_id = {w: i for i, w in enumerate(vocab)}
        self.id_to_word = {i: w for i, w in enumerate(vocab)}
    
    def encode(self, text):
        words = text.lower().split()
        return [self.word_to_id.get(w, 0) for w in words]  # 0 = UNK
    
    def decode(self, ids):
        return ' '.join([self.id_to_word.get(i, '<UNK>') for i in ids])
```

### Example 3: Positional Encoding

```python
def positional_encoding(seq_len, d_model):
    """Simple sinusoidal positional encoding"""
    position = np.arange(seq_len)[:, np.newaxis]
    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
    
    pe = np.zeros((seq_len, d_model))
    pe[:, 0::2] = np.sin(position * div_term)
    pe[:, 1::2] = np.cos(position * div_term)
    return pe
```

## Mock Components

### Language Model (Next-word Prediction)
```python
class ToyLM:
    def __init__(self, vocab_size, embed_dim=16):
        self.embeddings = np.random.randn(vocab_size, embed_dim) * 0.1
        self.output_proj = np.random.randn(embed_dim, vocab_size) * 0.1
    
    def forward(self, token_ids):
        # token_ids: (seq_len,)
        embeds = self.embeddings[token_ids]  # (seq_len, embed_dim)
        logits = embeds @ self.output_proj  # (seq_len, vocab_size)
        return logits
```

### Seq2Seq Encoder-Decoder
```python
class ToySeq2Seq:
    def encode(self, src_tokens):
        # Simple: return last hidden state
        embeds = self.src_embeddings[src_tokens]
        context = embeds.mean(axis=0)  # Aggregate
        return context
    
    def decode(self, tgt_tokens, context):
        embeds = self.tgt_embeddings[tgt_tokens]
        # Add context to each position
        hidden = embeds + context
        logits = hidden @ self.output_proj
        return logits
```

## Common Pitfalls in This Domain

❌ **Real pretrained models**: No BERT/GPT downloads  
❌ **Large vocabularies**: Keep < 500 words  
❌ **Long sequences**: Max 20 tokens  
❌ **BPE/WordPiece**: Use simple word-level tokenization  
❌ **Multi-head complexity**: 1-2 heads max  

✅ **Transparent attention**: Always visualize attention weights  
✅ **Small vocabulary**: Use frequent words only  
✅ **Character-level option**: Good for very simple tasks  
✅ **Show embeddings**: Visualize learned representations  

## Qualitative Validation

The toy implementation should demonstrate:
- **Attention patterns**: Attention focuses on relevant tokens
- **Embedding structure**: Similar words cluster together (if visualized)
- **Generation quality**: Output is coherent (for length of 5-10 tokens)
- **Learning dynamics**: Loss decreases, perplexity improves
- **Relative comparisons**: If paper compares methods, show the difference

## Specific Guidance

### For Attention Papers
- Show attention heatmap evolving during training
- Compare attention patterns: random init → trained
- Highlight which tokens attend to which

### For Transformer Papers
- Implement single layer first
- Show layer normalization effect
- Demonstrate positional encoding impact

### For Generation Papers
- Greedy decoding is sufficient (no beam search needed)
- Show top-k token predictions
- Generate 5-10 examples, not thousands
