import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Upload, Info } from 'lucide-react';

// --- 类型定义 ---
type Edge = { source: number; target: number };
type ParsedData = { n: number; weights: number[]; edges: Edge[] };
type StepState = {
  description: string;
  activeNode: number | null;
  activeEdge: Edge | null;
  dp: number[];
  nextNode: number[];
  finalPath: number[];
  maxStartNode: number | null;
};

// --- 默认输入数据 (题目样例) ---
const DEFAULT_INPUT = `6
5 10 20 5 4 5
1 2
1 4
2 4
3 4
4 5
4 6
5 6
0 0`;

// --- 解析输入数据 ---
const parseInput = (text: string): ParsedData | null => {
  try {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 3) return null;

    const n = parseInt(lines[0]);
    const weights = lines[1].split(/\s+/).map(Number);
    const edges: Edge[] = [];

    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/).map(Number);
      if (parts.length === 2) {
        if (parts[0] === 0 && parts[1] === 0) break;
        edges.push({ source: parts[0], target: parts[1] });
      }
    }
    return { n, weights, edges };
  } catch (e) {
    return null;
  }
};

// --- 计算节点布局 (简单的基于索引的水平布局) ---
const calculateLayout = (n: number) => {
  const positions: Record<number, { x: number; y: number }> = {};
  let maxX = 0;
  for (let i = 1; i <= n; i++) {
    const x = i * 120;
    // 简单的上下交替布局，避免连线过度重叠
    let y = 200;
    if (i % 3 === 2) y = 100;
    if (i % 3 === 0) y = 300;
    
    positions[i] = { x, y };
    maxX = Math.max(maxX, x);
  }
  return { positions, viewBox: `0 0 ${maxX + 120} 400` };
};

// --- 生成算法动画步骤 ---
const generateSteps = (data: ParsedData): StepState[] => {
  const { n, weights, edges } = data;
  const steps: StepState[] = [];
  
  // dp[i] 存储从节点 i 开始的最大地雷数
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) dp[i] = weights[i - 1]; // 初始值为自身地雷数
  
  // nextNode[i] 存储从节点 i 出发的最优下一步
  const nextNode = new Array(n + 1).fill(0);

  // 构建邻接表
  const adj: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const { source, target } of edges) {
    adj[source].push(target);
  }

  steps.push({
    description: "初始化：每个地窖的初始最大地雷数即为它本身埋藏的地雷数。因为图是单向且从小序号指向大序号的（DAG），我们采用动态规划，从序号最大的地窖开始逆序推导。",
    activeNode: null, activeEdge: null, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
  });

  // 逆序 DP
  for (let i = n; i >= 1; i--) {
    steps.push({
      description: `【阶段 ${i}】开始计算以地窖 ${i} 为起点的最大地雷数。当前自身地雷数为 ${weights[i - 1]}。`,
      activeNode: i, activeEdge: null, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
    });

    if (adj[i].length === 0) {
       steps.push({
        description: `地窖 ${i} 没有通向其他地窖的路径，计算完毕。最大地雷数 dp[${i}] = ${dp[i]}。`,
        activeNode: i, activeEdge: null, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
      });
      continue;
    }

    for (const j of adj[i]) {
      steps.push({
        description: `检查路径 ${i} -> ${j}。如果走这条路，总地雷数将是：自身(${weights[i - 1]}) + dp[${j}](${dp[j]}) = ${weights[i - 1] + dp[j]}。当前 dp[${i}] = ${dp[i]}。`,
        activeNode: i, activeEdge: { source: i, target: j }, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
      });

      if (dp[i] < weights[i - 1] + dp[j]) {
        dp[i] = weights[i - 1] + dp[j];
        nextNode[i] = j;
        steps.push({
          description: `发现更优解！更新 dp[${i}] = ${dp[i]}。记录下一步走向地窖 ${j}。`,
          activeNode: i, activeEdge: { source: i, target: j }, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
        });
      } else {
        steps.push({
          description: `走路径 ${i} -> ${j} 并没有比当前记录的方案更好，保持不变。`,
          activeNode: i, activeEdge: { source: i, target: j }, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: null
        });
      }
    }
  }

  // 寻找全局最大值和起点
  let maxVal = 0;
  let startNode = 0;
  for (let i = 1; i <= n; i++) {
    if (dp[i] > maxVal) {
      maxVal = dp[i];
      startNode = i;
    }
  }

  steps.push({
    description: `所有状态计算完毕！遍历 dp 数组，找到全局最大地雷数为 ${maxVal}，对应的最佳起点是地窖 ${startNode}。`,
    activeNode: startNode, activeEdge: null, dp: [...dp], nextNode: [...nextNode], finalPath: [], maxStartNode: startNode
  });

  // 回溯重构路径
  const path: number[] = [];
  let curr = startNode;
  while (curr !== 0) {
    path.push(curr);
    curr = nextNode[curr];
  }

  steps.push({
    description: `根据 next 数组回溯，最终的挖雷路径为: ${path.join(' -> ')}。共挖雷 ${maxVal} 个。算法结束。`,
    activeNode: null, activeEdge: null, dp: [...dp], nextNode: [...nextNode], finalPath: path, maxStartNode: startNode
  });

  return steps;
};

export default function DiggingLandminesApp() {
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [layout, setLayout] = useState<{positions: any, viewBox: string} | null>(null);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5); // 播放速度 (步/秒)

  // 初始化加载数据
  useEffect(() => {
    handleLoadData();
  }, []);

  // 自动播放逻辑
  useEffect(() => {
    let timer: number;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      timer = window.setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 1000 / speed);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, speed, steps.length]);

  const handleLoadData = () => {
    const data = parseInput(inputText);
    if (data) {
      setParsedData(data);
      setLayout(calculateLayout(data.n));
      const generatedSteps = generateSteps(data);
      setSteps(generatedSteps);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    } else {
      alert("输入格式错误，请检查！");
    }
  };

  if (!parsedData || !layout || steps.length === 0) return <div className="p-8 text-center">加载中...</div>;

  const currentStep = steps[currentStepIndex];
  const progress = (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              💣 挖地雷 (Digging Landmines)
            </h1>
            <p className="text-gray-500 text-sm mt-1">动态规划 (DP) 算法可视化演示</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-600">播放速度:</span>
            <input 
              type="range" min="0.5" max="5" step="0.5" value={speed} 
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <span className="text-sm font-mono w-8">{speed}x</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左侧：可视化区域 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 图结构展示 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative" style={{ height: '450px' }}>
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 border border-gray-200 shadow-sm z-10">
                图结构 (Graph)
              </div>
              <svg viewBox={layout.viewBox} className="w-full h-full">
                <defs>
                  <marker id="arrow-gray" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
                  </marker>
                  <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>
                  <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                  </marker>
                </defs>

                {/* 渲染边 */}
                {parsedData.edges.map((edge, idx) => {
                  const isFinal = currentStep.finalPath.includes(edge.source) && currentStep.nextNode[edge.source] === edge.target;
                  const isActive = currentStep.activeEdge?.source === edge.source && currentStep.activeEdge?.target === edge.target;
                  
                  let stroke = "#e5e7eb";
                  let marker = "url(#arrow-gray)";
                  let strokeWidth = 2;

                  if (isFinal) {
                    stroke = "#22c55e"; marker = "url(#arrow-green)"; strokeWidth = 4;
                  } else if (isActive) {
                    stroke = "#3b82f6"; marker = "url(#arrow-blue)"; strokeWidth = 4;
                  }

                  const p1 = layout.positions[edge.source];
                  const p2 = layout.positions[edge.target];

                  return (
                    <line 
                      key={`e-${idx}`} 
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                      stroke={stroke} strokeWidth={strokeWidth} 
                      markerEnd={marker}
                      className="transition-all duration-300 ease-in-out"
                    />
                  );
                })}

                {/* 渲染节点 */}
                {Array.from({length: parsedData.n}).map((_, i) => {
                  const nodeId = i + 1;
                  const pos = layout.positions[nodeId];
                  const isFinal = currentStep.finalPath.includes(nodeId);
                  const isActive = currentStep.activeNode === nodeId;
                  const isStart = currentStep.maxStartNode === nodeId;

                  let fill = "#ffffff";
                  let stroke = "#d1d5db";
                  let strokeWidth = 2;
                  let textColor = "#374151";

                  if (isFinal) {
                    fill = "#dcfce7"; stroke = "#22c55e"; strokeWidth = 3; textColor = "#166534";
                  } else if (isActive) {
                    fill = "#fef08a"; stroke = "#eab308"; strokeWidth = 3; textColor = "#854d0e";
                  }

                  if (isStart) {
                    strokeWidth = 4; stroke = "#ef4444"; // 红框标出最终起点
                  }

                  return (
                    <g key={`n-${nodeId}`} transform={`translate(${pos.x}, ${pos.y})`} className="transition-all duration-300 ease-in-out">
                      <circle r="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} className="shadow-sm" />
                      <text textAnchor="middle" dy="-2" fontSize="14" fontWeight="bold" fill={textColor}>{nodeId}</text>
                      <text textAnchor="middle" dy="14" fontSize="10" fill="#6b7280" fontWeight="500">w:{parsedData.weights[i]}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* DP 状态表格 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Info size={16} className="text-blue-500"/> 动态规划状态表 (DP Table)
              </h3>
              <table className="min-w-full text-sm text-center border-collapse">
                <thead>
                  <tr>
                    <th className="border-b-2 border-r p-3 bg-gray-50 text-gray-600 font-semibold w-32">地窖 (i)</th>
                    {Array.from({length: parsedData.n}).map((_, i) => (
                      <th key={i} className={`border-b-2 p-3 font-mono text-lg transition-colors ${currentStep.activeNode === i + 1 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-50 text-gray-700'}`}>
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-r p-3 bg-gray-50 text-gray-600 font-medium">地雷数 (w)</td>
                    {parsedData.weights.map((w, i) => (
                      <td key={i} className="border-b p-3 text-gray-600">{w}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border-b border-r p-3 bg-blue-50 text-blue-700 font-bold">最大雷数 (dp)</td>
                    {Array.from({length: parsedData.n}).map((_, i) => (
                      <td key={i} className={`border-b p-3 font-bold text-lg transition-colors ${currentStep.activeNode === i + 1 ? 'bg-yellow-50 text-blue-600' : 'text-gray-800'}`}>
                        {currentStep.dp[i + 1] !== 0 || i === parsedData.n-1 ? currentStep.dp[i + 1] : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border-r p-3 bg-green-50 text-green-700 font-medium">下一步 (next)</td>
                    {Array.from({length: parsedData.n}).map((_, i) => (
                      <td key={i} className={`p-3 transition-colors ${currentStep.activeNode === i + 1 ? 'bg-yellow-50 text-green-600 font-bold' : 'text-gray-500'}`}>
                        {currentStep.nextNode[i + 1] !== 0 ? currentStep.nextNode[i + 1] : '-'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 右侧：控制与解说 */}
          <div className="space-y-6 flex flex-col">
            
            {/* 解说面板 */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex-grow shadow-inner">
              <h3 className="text-sm font-bold text-blue-800 mb-3 uppercase tracking-wider">当前步骤解析</h3>
              <p className="text-gray-800 leading-relaxed text-lg min-h-[120px]">
                {currentStep.description}
              </p>
            </div>

            {/* 播放控制 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              {/* 进度条 */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2 font-mono">
                  <span>Step {currentStepIndex}</span>
                  <span>{steps.length - 1}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="重置">
                  <RotateCcw size={20} />
                </button>
                <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(Math.max(0, currentStepIndex - 1)); }} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" disabled={currentStepIndex === 0}>
                  <SkipBack size={20} />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className={`p-3 rounded-xl flex items-center justify-center w-16 transition-colors ${isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
                <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1)); }} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" disabled={currentStepIndex === steps.length - 1}>
                  <SkipForward size={20} />
                </button>
              </div>
            </div>

            {/* 数据输入区 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">测试数据输入</h3>
              <textarea 
                className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                spellCheck="false"
              />
              <button 
                onClick={handleLoadData}
                className="mt-3 w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Upload size={18} /> 加载并重置动画
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}