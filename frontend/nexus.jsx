import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Activity, Code, DollarSign, AlertTriangle, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, Loader2, RefreshCw, Calculator, Coins, PiggyBank, Target, ExternalLink, Github } from 'lucide-react';

const XIcon = ({ className }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>);

const calculateFundamentals = (subnet) => {
  const opExMult = {'Training': 2.5, 'Inference': 1.8, 'Compute': 2.2, 'Infrastructure': 1.5, 'AI Services': 1.2, 'Data': 0.8, 'Creative': 1.0, 'Security': 1.3, 'Analytics': 0.9, 'Finance': 1.4, 'Research': 1.6, 'Science': 2.0};
  const mult = opExMult[subnet.category] || 1.0;
  const annualOpEx = (500000 + (subnet.validationScore / 100) * 2000000) * mult;
  const dailyOpEx = annualOpEx / 365;
  const opExGrowthRate = 0.25 + (subnet.devActivityScore / 100) * 0.35 + (subnet.communityScore / 100) * 0.15;
  const dailyGrowthRate = Math.pow(1 + opExGrowthRate, 1/365) - 1;
  const dailyEmissions = 7200 * 0.41;
  const discountRate = 0.30;
  const fundamentalPrice = dailyOpEx / dailyEmissions;
  const price1Y = (dailyOpEx * Math.pow(1 + dailyGrowthRate, 365)) / dailyEmissions;
  const price4Y = (dailyOpEx * Math.pow(1 + dailyGrowthRate, 1461)) / (dailyEmissions / 2);
  const pvEmissions = ((dailyEmissions * 365 * 2 + (dailyEmissions/2) * 365 * 2) * ((fundamentalPrice + price4Y) / 2)) / Math.pow(1 + discountRate, 2);
  const currentPrice = parseFloat(subnet.price);
  const priceToFundamental = currentPrice / fundamentalPrice;
  return { annualOpEx, fundamentalPrice, price1Y, price4Y, pvEmissions, priceToFundamental, impliedReturn4Y: ((price4Y - currentPrice) / currentPrice) * 100, dailyEmissions, discountRate: discountRate * 100, opExGrowthRate: opExGrowthRate * 100, valuation: priceToFundamental < 0.8 ? 'UNDERVALUED' : priceToFundamental > 1.5 ? 'OVERVALUED' : 'FAIR VALUE' };
};

const subnetsData = [
  { id: 1, name: 'Text Prompting', category: 'AI Services', github: 'https://github.com/opentensor/prompting', website: 'https://bittensor.com', x: 'https://x.com/opentensor', thesis: 'Foundation text generation model.', risks: ['Competition', 'Commoditization', 'Latency'] },
  { id: 2, name: 'Omron', category: 'Finance', github: 'https://github.com/omron-ai', website: 'https://omron.ai', x: 'https://x.com/OmronAI', thesis: 'AI Liquid Re-staking Optimizer.', risks: ['DeFi risk', 'Smart contracts', 'Liquidity'] },
  { id: 3, name: 'MyShell TTS', category: 'Audio', github: 'https://github.com/myshell-ai', website: 'https://myshell.ai', x: 'https://x.com/myshell_ai', thesis: 'Open-source Text-to-Speech.', risks: ['Ethics', 'Latency', 'Languages'] },
  { id: 4, name: 'Targon', category: 'AI Services', github: 'https://github.com/manifold-inc/targon', website: 'https://manifoldlabs.xyz', x: 'https://x.com/manifoldlabs', thesis: 'Decentralized ML search.', risks: ['Accuracy', 'Scaling', 'Competition'] },
  { id: 5, name: 'OpenKaito', category: 'Data', github: 'https://github.com/OpenKaito', website: 'https://openkaito.com', x: 'https://x.com/openkaito', thesis: 'Web3 search decentralization.', risks: ['Freshness', 'Indexing', 'Quality'] },
  { id: 6, name: 'Nous Research', category: 'Training', github: 'https://github.com/NousResearch', website: 'https://nousresearch.com', x: 'https://x.com/NousResearch', thesis: 'LLM fine-tuning with synthetic data.', risks: ['Dataset', 'Overfitting', 'Resources'] },
  { id: 7, name: 'SubVortex', category: 'Infrastructure', github: 'https://github.com/eclipsevortex/SubVortex', website: 'https://subvortex.xyz', x: 'https://x.com/subvortex_tao', thesis: 'Decentralized subtensor nodes.', risks: ['Uptime', 'Sync', 'Network'] },
  { id: 8, name: 'Taoshi', category: 'Finance', github: 'https://github.com/taoshidev/proprietary-trading-network', website: 'https://taoshi.io', x: 'https://x.com/taaborhi', thesis: 'Decentralized financial forecasting.', risks: ['Volatility', 'Accuracy', 'Regulatory'] },
  { id: 9, name: 'Pre-training', category: 'Training', github: 'https://github.com/macrocosm-os/pretraining', website: 'https://macrocosmos.ai', x: 'https://x.com/macrocosmos_ai', thesis: 'Distributed model pre-training.', risks: ['Compute', 'Data', 'Stability'] },
  { id: 10, name: 'Sturdy', category: 'Finance', github: 'https://github.com/Sturdy-Subnet/sturdy-subnet', website: 'https://sturdy.finance', x: 'https://x.com/SturdyFinance', thesis: 'DeFi yield optimization.', risks: ['Smart contracts', 'Liquidity', 'Yields'] },
  { id: 11, name: 'Dippy', category: 'Social', github: 'https://github.com/impel-intelligence/dippy-bittensor-subnet', website: 'https://dippy.ai', x: 'https://x.com/DippyAI', thesis: 'AI companions for roleplay.', risks: ['Safety', 'Attachment', 'Ethics'] },
  { id: 12, name: 'ComputeHorde', category: 'Compute', github: 'https://github.com/backend-developers-ltd/ComputeHorde', website: 'https://computehorde.io', x: 'https://x.com/ComputeHorde', thesis: 'Distributed GPU marketplace.', risks: ['Hardware', 'Pricing', 'Utilization'] },
  { id: 13, name: 'Data Universe', category: 'Data', github: 'https://github.com/macrocosm-os/data-universe', website: 'https://gravity.macrocosmos.ai', x: 'https://x.com/macrocosmos_ai', thesis: 'Decentralized data scraping.', risks: ['Legal', 'Quality', 'Access'] },
  { id: 14, name: 'LLM Defender', category: 'Security', github: 'https://github.com/synapsec-ai/llm-defender-subnet', website: 'https://synapsec.ai', x: 'https://x.com/synapsec_ai', thesis: 'AI safety and jailbreak prevention.', risks: ['Adversarial', 'False positives', 'Evolution'] },
  { id: 15, name: 'Datura', category: 'Data', github: 'https://github.com/Datura-ai/smart-scrape', website: 'https://datura.ai', x: 'https://x.com/datura_ai', thesis: 'Decentralized web services.', risks: ['Reliability', 'Cost', 'Competition'] },
  { id: 16, name: 'BitAds', category: 'Marketing', github: 'https://github.com/eseckft/BitAds.ai', website: 'https://bitads.ai', x: 'https://x.com/BitAdsAI', thesis: 'AI-optimized advertising.', risks: ['Ad fraud', 'Privacy', 'Attribution'] },
  { id: 17, name: 'Three Gen', category: 'Creative', github: 'https://github.com/404-Brain-Not-Found-Org/three-gen-subnet', website: 'https://3gen.ai', x: 'https://x.com/ThreeGenAI', thesis: '3D generation network.', risks: ['Quality', 'Compute', 'Use cases'] },
  { id: 18, name: 'Cortex.t', category: 'Inference', github: 'https://github.com/corcel-api/cortex.t', website: 'https://corcel.io', x: 'https://x.com/corcel_io', thesis: 'High-performance inference.', risks: ['Uptime', 'Costs', 'Scaling'] },
  { id: 19, name: 'Vision', category: 'AI Services', github: 'https://github.com/namoray/vision', website: 'https://nineteen.ai', x: 'https://x.com/NineteenAI', thesis: 'Computer vision processing.', risks: ['Edge cases', 'Adaptation', 'Privacy'] },
  { id: 20, name: 'BitAgent', category: 'Agents', github: 'https://github.com/RogueTensor/bitagent_subnet', website: 'https://bitagent.io', x: 'https://x.com/BitAgentAI', thesis: 'Autonomous AI agents.', risks: ['Reliability', 'Security', 'Complexity'] },
  { id: 21, name: 'FileTAO', category: 'Storage', github: 'https://github.com/ifrit98/storage-subnet', website: 'https://filetao.com', x: 'https://x.com/FileTAO', thesis: 'Decentralized file storage.', risks: ['Speed', 'Redundancy', 'Integrity'] },
  { id: 22, name: 'Meta Search', category: 'Data', github: 'https://github.com/surcyf123/smart-scrape', website: 'https://smartscrape.ai', x: 'https://x.com/SmartScrapeAI', thesis: 'Intelligent web scraping.', risks: ['Detection', 'Legal', 'Changes'] },
  { id: 23, name: 'SocialTensor', category: 'Social', github: 'https://github.com/SocialTensor/SocialTensorSubnet', website: 'https://socialtensor.io', x: 'https://x.com/SocialTensor', thesis: 'Social media AI.', risks: ['Access', 'Freshness', 'Accuracy'] },
  { id: 24, name: 'Omega', category: 'Research', github: 'https://github.com/omegalabsinc/omegalabs-bittensor-subnet', website: 'https://omega.inc', x: 'https://x.com/omaboralabs', thesis: 'Multimodal AGI dataset.', risks: ['Scale', 'Quality', 'Diversity'] },
  { id: 25, name: 'Protein Folding', category: 'Science', github: 'https://github.com/macrocosm-os/folding', website: 'https://fold.macrocosmos.ai', x: 'https://x.com/macrocosmos_ai', thesis: 'Protein structure prediction.', risks: ['Accuracy', 'Compute', 'Validation'] },
  { id: 26, name: 'Image Alchemy', category: 'Creative', github: 'https://github.com/atelion/image-alchemy-subnet', website: 'https://imagealchemy.ai', x: 'https://x.com/ImageAlchemy', thesis: 'Image transformation.', risks: ['Deepfakes', 'Quality', 'Copyright'] },
  { id: 27, name: 'Compute', category: 'Compute', github: 'https://github.com/neuralinternet/compute-subnet', website: 'https://neuralinternet.ai', x: 'https://x.com/NeuralInternet', thesis: 'Distributed GPU compute.', risks: ['Hardware', 'Pricing', 'Utilization'] },
  { id: 28, name: 'Foundry S&P', category: 'Finance', github: 'https://github.com/foundryservices/snpOracle', website: 'https://foundryai.xyz', x: 'https://x.com/foundry_ai', thesis: 'Financial prediction.', risks: ['Accuracy', 'Markets', 'Regulation'] },
  { id: 29, name: 'Fractal', category: 'Creative', github: 'https://github.com/fractal-research', website: 'https://fractal.network', x: 'https://x.com/FractalResearch', thesis: 'Generative research.', risks: ['Quality', 'Novelty', 'Applications'] },
  { id: 30, name: 'Bettensor', category: 'Prediction', github: 'https://github.com/bettensor/bettensor', website: 'https://bettensor.com', x: 'https://x.com/Bettensor', thesis: 'Sports prediction markets.', risks: ['Regulatory', 'Manipulation', 'Liquidity'] },
  { id: 31, name: 'NAS Chain', category: 'Infrastructure', github: 'https://github.com/naschain', website: 'https://naschain.io', x: 'https://x.com/NASChain', thesis: 'Neural architecture search.', risks: ['Compute', 'Complexity', 'Results'] },
  { id: 32, name: 'ITS', category: 'Translation', github: 'https://github.com/bittranslateio/bittranslate', website: 'https://bittranslate.io', x: 'https://x.com/bittranslate', thesis: 'AI translation.', risks: ['Languages', 'Nuance', 'Quality'] },
  { id: 33, name: 'ReadyAI', category: 'AI Services', github: 'https://github.com/AIT-Protocol/einstein-ait-prod', website: 'https://aitprotocol.ai', x: 'https://x.com/AIT_Protocol', thesis: 'AI readiness assessment.', risks: ['Accuracy', 'Standards', 'Adoption'] },
  { id: 34, name: 'BitMind', category: 'Security', github: 'https://github.com/BitMind-AI/bitmind-subnet', website: 'https://bitmind.ai', x: 'https://x.com/BitMindAI', thesis: 'Deepfake detection.', risks: ['Accuracy', 'Evolution', 'Speed'] },
  { id: 35, name: 'LogicNet', category: 'Reasoning', github: 'https://github.com/LogicNet-Subnet/LogicNet', website: 'https://logicnet.ai', x: 'https://x.com/LogicNetAI', thesis: 'Logical reasoning AI.', risks: ['Errors', 'Edge cases', 'Explanation'] },
  { id: 36, name: 'WOMBO', category: 'Creative', github: 'https://github.com/wombo-ai', website: 'https://wombo.ai', x: 'https://x.com/WOMBO', thesis: 'AI-powered creativity.', risks: ['Quality', 'Copyright', 'Competition'] },
  { id: 37, name: 'Finetuning', category: 'Training', github: 'https://github.com/macrocosm-os/finetuning', website: 'https://macrocosmos.ai', x: 'https://x.com/macrocosmos_ai', thesis: 'Automated fine-tuning.', risks: ['Hyperparameters', 'Overfitting', 'Resources'] },
  { id: 38, name: 'Templar', category: 'Training', github: 'https://github.com/RaoFoundation/templar', website: 'https://raofoundation.org', x: 'https://x.com/RaoFoundation', thesis: 'Large-scale training.', risks: ['Sync', 'Gradients', 'Bandwidth'] },
  { id: 39, name: 'EdgeMaxxing', category: 'Inference', github: 'https://github.com/womboai/edge-maxxing', website: 'https://wombo.ai', x: 'https://x.com/WOMBO', thesis: 'Edge inference optimization.', risks: ['Hardware', 'Latency', 'Models'] },
  { id: 40, name: 'Chunking', category: 'Data', github: 'https://github.com/VectorChat/chunking_subnet', website: 'https://vectorchat.ai', x: 'https://x.com/VectorChatAI', thesis: 'Document chunking for RAG.', risks: ['Context', 'Boundaries', 'Coherence'] },
  { id: 41, name: 'Sports Prediction', category: 'Prediction', github: 'https://github.com/score-protocol/score-predict', website: 'https://scoreprotocol.xyz', x: 'https://x.com/ScoreProtocol', thesis: 'Sports analytics.', risks: ['Accuracy', 'Efficiency', 'Unpredictability'] },
  { id: 42, name: 'Masa', category: 'Data', github: 'https://github.com/masa-finance/masa-bittensor', website: 'https://masa.finance', x: 'https://x.com/getmasafi', thesis: 'Decentralized data network.', risks: ['Quality', 'Network effects', 'Monetization'] },
  { id: 43, name: 'Graphite', category: 'Analytics', github: 'https://github.com/GraphiteAI/Graphite-Subnet', website: 'https://graphite.ai', x: 'https://x.com/GraphiteAI', thesis: 'Graph optimization problems.', risks: ['Complexity', 'Scaling', 'Applications'] },
  { id: 44, name: 'SybilShield', category: 'Security', github: 'https://github.com/sybilshield', website: 'https://sybilshield.ai', x: 'https://x.com/SybilShield', thesis: 'Sybil attack prevention.', risks: ['Detection', 'False positives', 'Adaptation'] },
  { id: 45, name: 'Gen42', category: 'Creative', github: 'https://github.com/gen42-ai', website: 'https://gen42.ai', x: 'https://x.com/Gen42AI', thesis: 'Creative content generation.', risks: ['Quality', 'Copyright', 'Style'] },
  { id: 46, name: 'NeuralAI', category: 'Infrastructure', github: 'https://github.com/neuralinternet', website: 'https://neuralinternet.ai', x: 'https://x.com/NeuralInternet', thesis: 'Neural infrastructure.', risks: ['Latency', 'Reliability', 'Integration'] },
  { id: 47, name: 'Condense', category: 'Data', github: 'https://github.com/condenses/subnet', website: 'https://condenses.ai', x: 'https://x.com/CondensesAI', thesis: 'AI summarization.', risks: ['Info loss', 'Accuracy', 'Context'] },
  { id: 48, name: 'Nextplace', category: 'Analytics', github: 'https://github.com/Nextplace-ai/nextplace', website: 'https://nextplace.ai', x: 'https://x.com/NextplaceAI', thesis: 'Real estate prediction.', risks: ['Privacy', 'Accuracy', 'Markets'] },
  { id: 49, name: 'Hivetrain', category: 'Training', github: 'https://github.com/hivetrain', website: 'https://hivetrain.ai', x: 'https://x.com/HivetrainAI', thesis: 'Swarm training.', risks: ['Coordination', 'Convergence', 'Resources'] },
  { id: 50, name: 'Infinite Games', category: 'Prediction', github: 'https://github.com/infinite-games', website: 'https://infinitegames.ai', x: 'https://x.com/InfGamesAI', thesis: 'Game theory predictions.', risks: ['Complexity', 'Accuracy', 'Applications'] },
  { id: 51, name: 'CeliumX', category: 'AI Services', github: 'https://github.com/celiumx', website: 'https://celiumx.ai', x: 'https://x.com/CeliumX', thesis: 'AI marketplace.', risks: ['Adoption', 'Quality', 'Competition'] },
  { id: 52, name: 'Dojo', category: 'Training', github: 'https://github.com/tensorplex-labs/dojo', website: 'https://tensorplex.ai', x: 'https://x.com/TensorplexLabs', thesis: 'RLHF training dojo.', risks: ['Efficiency', 'Gaming', 'Generalization'] },
  { id: 53, name: 'VOD', category: 'Creative', github: 'https://github.com/vod-subnet', website: 'https://vod.ai', x: 'https://x.com/VODSubnet', thesis: 'Video on demand AI.', risks: ['Quality', 'Bandwidth', 'Rights'] },
  { id: 54, name: 'Soundscape', category: 'Audio', github: 'https://github.com/soundscape-ai', website: 'https://soundscape.ai', x: 'https://x.com/SoundscapeAI', thesis: 'Audio generation.', risks: ['Quality', 'Rights', 'Real-time'] },
  { id: 55, name: 'Dreamup', category: 'Creative', github: 'https://github.com/dreamup-subnet', website: 'https://dreamup.ai', x: 'https://x.com/DreamupAI', thesis: 'Dream-based generation.', risks: ['Quality', 'Interpretation', 'Ethics'] },
  { id: 56, name: 'Gradient', category: 'Training', github: 'https://github.com/gradient-subnet', website: 'https://gradient.ai', x: 'https://x.com/GradientNet', thesis: 'Gradient optimization.', risks: ['Vanishing', 'Communication', 'Convergence'] },
  { id: 57, name: 'Gaia', category: 'Science', github: 'https://github.com/gaia-subnet', website: 'https://gaia.earth', x: 'https://x.com/GaiaSubnet', thesis: 'Climate AI modeling.', risks: ['Accuracy', 'Data', 'Compute'] },
  { id: 58, name: 'Coldint', category: 'Intelligence', github: 'https://github.com/coldint-subnet', website: 'https://coldint.ai', x: 'https://x.com/ColdintAI', thesis: 'OSINT gathering.', risks: ['Reliability', 'Overload', 'Bias'] },
  { id: 59, name: 'Agent Arena', category: 'Agents', github: 'https://github.com/masa-finance/agent-arena-subnet', website: 'https://masa.finance', x: 'https://x.com/getmasafi', thesis: 'Agent competition arena.', risks: ['Validity', 'Gaming', 'Transfer'] },
  { id: 60, name: 'Healthi', category: 'Healthcare', github: 'https://github.com/healthi-ai', website: 'https://healthi.ai', x: 'https://x.com/HealthiAI', thesis: 'Health AI diagnostics.', risks: ['Regulation', 'Liability', 'Privacy'] },
  { id: 61, name: 'Red Team', category: 'Security', github: 'https://github.com/redteam-subnet', website: 'https://redteam.ai', x: 'https://x.com/RedTeamAI', thesis: 'AI red teaming.', risks: ['Discovery', 'Disclosure', 'Coverage'] },
  { id: 62, name: 'Taoverse', category: 'Creative', github: 'https://github.com/taoverse', website: 'https://taoverse.ai', x: 'https://x.com/TaoverseAI', thesis: 'AI-generated universes.', risks: ['Quality', 'Coherence', 'Scale'] },
  { id: 63, name: 'ZK ML', category: 'Privacy', github: 'https://github.com/zkml-subnet', website: 'https://zkml.ai', x: 'https://x.com/ZKML_AI', thesis: 'Zero-knowledge AI.', risks: ['Overhead', 'Complexity', 'Adoption'] },
  { id: 64, name: 'Chutes', category: 'Infrastructure', github: 'https://github.com/chutes-ai/chutes-subnet', website: 'https://chutes.ai', x: 'https://x.com/ChutesAI', thesis: 'AI deployment pipelines.', risks: ['Reliability', 'Integrity', 'Latency'] },
];

const milestones = [['Mainnet v2.0', 'Partnerships', 'SDK'], ['Token upgrade', 'Cross-chain', 'Mobile'], ['Performance', 'Architecture', 'Governance'], ['API v3', 'Acquisitions', 'Grants']];

const generateSubnetData = () => subnetsData.map((s, i) => {
  const baseScore = 50 + Math.random() * 30;
  const devActivity = Math.min(100, Math.max(30, Math.floor(baseScore + (Math.random() - 0.5) * 20)));
  const codeQuality = Math.min(100, Math.max(30, Math.floor(baseScore + (Math.random() - 0.5) * 15)));
  const incentiveStability = Math.min(100, Math.max(30, Math.floor(baseScore + (Math.random() - 0.5) * 25)));
  const community = Math.min(100, Math.max(30, Math.floor(baseScore + (Math.random() - 0.5) * 20)));
  const economic = Math.min(100, Math.max(30, Math.floor(baseScore + (Math.random() - 0.5) * 18)));
  const validationScore = Math.floor(devActivity * 0.25 + codeQuality * 0.20 + incentiveStability * 0.25 + community * 0.15 + economic * 0.15);
  const taoFlow = (Math.random() * 200 - 50).toFixed(1);
  return { ...s, price: (Math.random() * 45 + 5).toFixed(2), priceChange: (Math.random() * 24 - 12).toFixed(2), marketCap: (Math.random() * 8000000 + 200000).toFixed(0), emission: (Math.random() * 4 + 0.2).toFixed(2), taoFlow, taoFlowChange: (Math.random() * 30 - 15).toFixed(1), validators: Math.floor(Math.random() * 120 + 15), nominators: Math.floor(Math.random() * 800 + 30), commits30d: Math.floor(Math.random() * 250 + 10), coreDev: Math.floor(Math.random() * 12 + 2), validationScore, devActivityScore: devActivity, codeQualityScore: codeQuality, incentiveStabilityScore: incentiveStability, communityScore: community, economicScore: economic, nextMilestones: milestones[i % milestones.length], stakingAPY: (Math.random() * 35 + 8).toFixed(1), testCoverage: Math.floor(Math.random() * 45 + 45), lastCommit: Math.floor(Math.random() * 10 + 1) };
});

export default function DeAINexusTerminal() {
  const [subnets, setSubnets] = useState(() => generateSubnetData());
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'validationScore', direction: 'desc' });
  const [filterCategory, setFilterCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [taoPrice, setTaoPrice] = useState(150.82);
  const [taoPriceChange, setTaoPriceChange] = useState(-0.29);
  const taoVolume = 116.4;

  useEffect(() => {
    const interval = setInterval(() => {
      setTaoPrice(p => { const change = (Math.random() - 0.5) * 0.3 * p / 100; return Math.max(140, Math.min(165, p + change)); });
      setTaoPriceChange(p => Math.max(-5, Math.min(5, p + (Math.random() - 0.5) * 0.1)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(() => {
    let f = filterCategory === 'all' ? subnets : subnets.filter(s => s.category === filterCategory);
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)); }
    return [...f].sort((a, b) => { const av = parseFloat(a[sortConfig.key]) || 0, bv = parseFloat(b[sortConfig.key]) || 0; return sortConfig.direction === 'asc' ? av - bv : bv - av; });
  }, [subnets, sortConfig, filterCategory, searchQuery]);

  const handleSort = k => setSortConfig(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }));
  const handleRefresh = () => { setIsLoading(true); setTimeout(() => { setSubnets(generateSubnetData()); setLastRefresh(new Date()); setIsLoading(false); }, 800); };
  const getScoreColor = s => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-orange-400';
  const getScoreBg = s => s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-orange-500';
  const getValColor = v => v === 'UNDERVALUED' ? 'text-emerald-400' : v === 'OVERVALUED' ? 'text-red-400' : 'text-amber-400';
  const getValBg = v => v === 'UNDERVALUED' ? 'bg-emerald-500/20 border-emerald-500/30' : v === 'OVERVALUED' ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-500/20 border-amber-500/30';
  const SortIcon = ({ k }) => sortConfig.key !== k ? <ArrowUpDown className="w-3 h-3 opacity-40" /> : sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  const categories = ['all', ...new Set(subnets.map(s => s.category))].sort();
  const metrics = { mcap: subnets.reduce((a, s) => a + parseFloat(s.marketCap), 0), emission: (subnets.reduce((a, s) => a + parseFloat(s.emission), 0) / subnets.length).toFixed(2), score: Math.floor(subnets.reduce((a, s) => a + s.validationScore, 0) / subnets.length), taoFlow: subnets.reduce((a, s) => a + parseFloat(s.taoFlow), 0) };
  const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div><h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">DeAI Nexus Terminal</h1><p className="text-slate-500 text-xs">Bittensor Intelligence • Yuma Model • {subnets.length} Subnets</p></div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-40" />
            <button onClick={handleRefresh} disabled={isLoading} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg disabled:opacity-50">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg flex items-center gap-2"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /><span className="text-xs font-medium">Live</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-gradient-to-br from-violet-600/30 to-violet-800/30 border border-violet-500/40 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1"><Coins className="w-4 h-4 text-violet-400" /><span className="text-xs text-slate-400">TAO/USD</span><span className="text-xs text-violet-400 animate-pulse">●</span></div>
            <div className="text-xl font-bold text-white">${taoPrice.toFixed(2)}</div>
            <div className={`text-xs flex items-center gap-1 ${taoPriceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{taoPriceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{taoPriceChange >= 0 ? '+' : ''}{taoPriceChange.toFixed(2)}%</div>
            <div className="text-xs text-slate-500 mt-1">Vol: ${taoVolume}M</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 border border-cyan-500/40 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-cyan-400" /><span className="text-xs text-slate-400">TAO Flow (24h)</span></div>
            <div className={`text-xl font-bold ${metrics.taoFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.taoFlow >= 0 ? '+' : ''}{metrics.taoFlow.toFixed(0)} τ</div>
            <div className="text-xs text-slate-500">Net subnet flow</div>
          </div>
          <div className="bg-emerald-600/20 border border-emerald-500/30 p-3 rounded-xl"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-3 h-3 text-emerald-400" /><span className="text-xs text-slate-400">Total MCap</span></div><div className="text-xl font-bold">${(metrics.mcap/1e6).toFixed(1)}M</div></div>
          <div className="bg-amber-600/20 border border-amber-500/30 p-3 rounded-xl"><div className="flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-amber-400" /><span className="text-xs text-slate-400">Avg Emission</span></div><div className="text-xl font-bold">{metrics.emission}%</div></div>
          <div className="bg-pink-600/20 border border-pink-500/30 p-3 rounded-xl"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-3 h-3 text-pink-400" /><span className="text-xs text-slate-400">Avg Score</span></div><div className="text-xl font-bold">{metrics.score}</div></div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">{categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterCategory === c ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}</div>
        <p className="text-xs text-slate-500 mb-2">Showing {sorted.length} of {subnets.length} subnets</p>
        {isLoading ? <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-slate-800"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div> : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"><div className="overflow-auto max-h-[550px]">
            <table className="w-full"><thead className="bg-slate-800/80 sticky top-0 z-10"><tr>
              <th className="text-left p-3 text-xs font-semibold uppercase text-slate-400">Subnet</th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer" onClick={() => handleSort('price')}><div className="flex items-center justify-end gap-1">Price <SortIcon k="price" /></div></th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer hidden md:table-cell" onClick={() => handleSort('taoFlow')}><div className="flex items-center justify-end gap-1">TAO Flow <SortIcon k="taoFlow" /></div></th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer hidden lg:table-cell" onClick={() => handleSort('emission')}><div className="flex items-center justify-end gap-1">Emission <SortIcon k="emission" /></div></th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer hidden lg:table-cell" onClick={() => handleSort('stakingAPY')}><div className="flex items-center justify-end gap-1">APY <SortIcon k="stakingAPY" /></div></th>
              <th className="text-right p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer hidden md:table-cell" onClick={() => handleSort('commits30d')}><div className="flex items-center justify-end gap-1">Commits <SortIcon k="commits30d" /></div></th>
              <th className="text-center p-3 text-xs font-semibold uppercase text-slate-400 cursor-pointer" onClick={() => handleSort('validationScore')}><div className="flex items-center justify-center gap-1">Score <SortIcon k="validationScore" /></div></th>
              <th className="p-3 w-8"></th>
            </tr></thead>
            <tbody>{sorted.map((sn, i) => {
              const fund = expandedRow === sn.id ? calculateFundamentals(sn) : null;
              return (<React.Fragment key={sn.id}>
                <tr className={`border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${i % 2 ? 'bg-slate-900/30' : ''}`} onClick={() => setExpandedRow(expandedRow === sn.id ? null : sn.id)}>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs text-white">{sn.id}</div><div><div className="font-semibold text-sm text-white">{sn.name}</div><div className="text-xs text-slate-500">{sn.category}</div></div></div></td>
                  <td className="p-3 text-right"><div className="font-mono font-semibold text-sm">${sn.price}</div><div className={`text-xs flex items-center justify-end gap-1 ${parseFloat(sn.priceChange) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(sn.priceChange) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{sn.priceChange}%</div></td>
                  <td className="p-3 text-right hidden md:table-cell"><div className={`font-mono text-sm ${parseFloat(sn.taoFlow) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(sn.taoFlow) >= 0 ? '+' : ''}{sn.taoFlow} τ</div><div className={`text-xs ${parseFloat(sn.taoFlowChange) >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>{parseFloat(sn.taoFlowChange) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(sn.taoFlowChange))}%</div></td>
                  <td className="p-3 text-right font-mono text-sm text-slate-300 hidden lg:table-cell">{sn.emission}%</td>
                  <td className="p-3 text-right hidden lg:table-cell"><span className="text-emerald-400 font-semibold text-sm">{sn.stakingAPY}%</span></td>
                  <td className="p-3 text-right font-mono text-sm text-slate-300 hidden md:table-cell">{sn.commits30d}</td>
                  <td className="p-3"><div className="flex justify-center"><div className={`${getScoreBg(sn.validationScore)} rounded px-2 py-1`}><span className="text-white font-bold text-sm">{sn.validationScore}</span></div></div></td>
                  <td className="p-3"><button className="text-slate-500 hover:text-slate-300 p-1">{expandedRow === sn.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></td>
                </tr>
                {expandedRow === sn.id && fund && <tr><td colSpan={8} className="p-0"><div className="bg-slate-900/80 border-t border-violet-500/30 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <a href={sn.github} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors"><Github className="w-4 h-4" />GitHub</a>
                    <a href={sn.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors"><ExternalLink className="w-4 h-4" />Website</a>
                    <a href={sn.x} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors"><XIcon className="w-4 h-4" />X.com</a>
                  </div>
                  <div className="mb-6"><h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" />Fundamental Valuation (Yuma Model)</h3>
                    <div className={`${getValBg(fund.valuation)} border rounded-lg p-3 mb-4`}><div className="flex items-center justify-between"><div><div className="text-xs text-slate-400 uppercase">Valuation</div><div className={`text-lg font-bold ${getValColor(fund.valuation)}`}>{fund.valuation}</div></div><div className="text-right"><div className="text-xs text-slate-400">Price/Fundamental</div><div className={`text-lg font-bold ${fund.priceToFundamental < 1 ? 'text-emerald-400' : fund.priceToFundamental > 1.5 ? 'text-red-400' : 'text-amber-400'}`}>{fund.priceToFundamental.toFixed(2)}x</div></div></div></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><Target className="w-3 h-3 text-violet-400" /><span className="text-xs text-slate-500">Fundamental Price</span></div><div className="text-lg font-bold text-white">${fund.fundamentalPrice.toFixed(2)}</div><div className="text-xs text-slate-500">OpEx replacement</div></div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-3 h-3 text-emerald-400" /><span className="text-xs text-slate-500">Annual OpEx</span></div><div className="text-lg font-bold text-white">{fmt(fund.annualOpEx)}</div><div className="text-xs text-slate-500">{fund.opExGrowthRate.toFixed(0)}% growth</div></div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3 h-3 text-cyan-400" /><span className="text-xs text-slate-500">1Y Target</span></div><div className="text-lg font-bold text-white">${fund.price1Y.toFixed(2)}</div><div className={`text-xs ${fund.price1Y > parseFloat(sn.price) ? 'text-emerald-400' : 'text-red-400'}`}>{((fund.price1Y - parseFloat(sn.price)) / parseFloat(sn.price) * 100).toFixed(0)}%</div></div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><PiggyBank className="w-3 h-3 text-amber-400" /><span className="text-xs text-slate-500">4Y Target</span></div><div className="text-lg font-bold text-white">${fund.price4Y.toFixed(2)}</div><div className="text-xs text-slate-500">Post-halving</div></div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-slate-900/50 rounded p-2 border border-slate-800"><div className="text-xs text-slate-500">Daily Emissions</div><div className="text-sm font-semibold text-slate-300">{fund.dailyEmissions.toFixed(0)} τ</div></div>
                      <div className="bg-slate-900/50 rounded p-2 border border-slate-800"><div className="text-xs text-slate-500">PV 4Y Emissions</div><div className="text-sm font-semibold text-slate-300">{fmt(fund.pvEmissions)}</div></div>
                      <div className="bg-slate-900/50 rounded p-2 border border-slate-800"><div className="text-xs text-slate-500">4Y Return</div><div className={`text-sm font-semibold ${fund.impliedReturn4Y > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fund.impliedReturn4Y > 0 ? '+' : ''}{fund.impliedReturn4Y.toFixed(0)}%</div></div>
                      <div className="bg-slate-900/50 rounded p-2 border border-slate-800"><div className="text-xs text-slate-500">Discount Rate</div><div className="text-sm font-semibold text-slate-300">{fund.discountRate}%</div></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-4">{[['Dev', sn.devActivityScore, '25%'], ['Code', sn.codeQualityScore, '20%'], ['Incentives', sn.incentiveStabilityScore, '25%'], ['Community', sn.communityScore, '15%'], ['Economics', sn.economicScore, '15%']].map(([l, s, w]) => <div key={String(l)} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2"><div className="text-xs text-slate-500">{String(l)}</div><div className={`text-lg font-bold ${getScoreColor(Number(s))}`}>{String(s)}</div><div className="text-xs text-slate-600">{String(w)}</div></div>)}</div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3"><h4 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-2"><CheckCircle className="w-3 h-3" />Thesis</h4><p className="text-xs text-slate-400 mb-3">{sn.thesis}</p><div className="border-t border-slate-700 pt-2"><div className="text-xs text-slate-500 uppercase mb-2">Milestones</div>{sn.nextMilestones.map((m, j) => <div key={j} className="text-xs text-slate-400 bg-slate-900/50 rounded p-1.5 mb-1 border border-slate-800">• {m}</div>)}</div></div>
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3"><h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-2"><Code className="w-3 h-3" />Technical</h4><div className="grid grid-cols-2 gap-2">{[['Devs', sn.coreDev], ['Commits', sn.commits30d], ['Coverage', `${sn.testCoverage}%`], ['Last', `${sn.lastCommit}d`], ['Validators', sn.validators], ['Nominators', sn.nominators]].map(([k, v]) => <div key={String(k)} className="bg-slate-900/50 rounded p-2 border border-slate-800"><div className="text-xs text-slate-500">{String(k)}</div><div className="text-sm font-semibold text-slate-300">{String(v)}</div></div>)}</div></div>
                    <div className="space-y-3"><div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3"><h4 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-3 h-3" />Risks</h4>{sn.risks.map((r, j) => <div key={j} className="text-xs text-slate-400 bg-orange-500/10 border border-orange-500/20 rounded p-1.5 mb-1 flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-orange-400" />{r}</div>)}</div><div className="bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-violet-500/30 rounded-lg p-3"><div className="text-xs text-slate-400 uppercase">Rating</div><div className="text-lg font-bold text-white">{sn.validationScore >= 80 ? 'HIGH CONVICTION' : sn.validationScore >= 60 ? 'MODERATE' : 'MONITOR'}</div><div className="flex justify-between text-xs mt-1"><span className="text-slate-400">Score: <span className="text-white font-semibold">{sn.validationScore}</span></span><span className="text-slate-400">APY: <span className="text-emerald-400 font-semibold">{sn.stakingAPY}%</span></span></div></div></div>
                  </div>
                </div></td></tr>}
              </React.Fragment>);
            })}</tbody>
          </table></div></div>
        )}
        <div className="mt-4 p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex justify-between items-center text-xs"><div><span className="text-slate-400 font-semibold">DeAI Nexus Terminal</span><span className="text-slate-600 ml-2">• Yuma Model • <a href="https://taostats.io" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400">Taostats</a> • <a href="https://github.com/opentensor/bittensor" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400">GitHub</a></span></div><div className="text-slate-500">{lastRefresh.toLocaleString()}</div></div>
      </div>
    </div>
  );
}
