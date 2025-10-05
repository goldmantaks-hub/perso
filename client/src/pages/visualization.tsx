import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import * as d3 from "d3";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { buildGraphData, calculateNodePositions, getNodeGlowIntensity, getLinkOpacity } from "@/lib/graphData";
import { normalizeInfluenceScores } from "@/lib/influence";
import { useWebSocket } from "@/hooks/useWebSocket";
import BottomNav from "@/components/bottom-nav";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface EmotionDataPoint {
  timestamp: number;
  emotion: string;
  intensity: number;
  personaName: string;
}

interface PersonaData {
  id: string;
  name: string;
  mood: string;
  influence: number;
  messageCount: number;
  replyRate: number;
  connection: number;
  emotionImpact: number;
  lastInteraction: number;
}

export default function VisualizationPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionDataPoint[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: personas = [] } = useQuery<PersonaData[]>({
    queryKey: ['/api/personas/visualization', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/personas');
      if (!response.ok) throw new Error('Failed to fetch personas');
      return response.json();
    }
  });

  const { socket } = useWebSocket({});

  useEffect(() => {
    if (!socket) return;

    socket.on('conversation:end', (data) => {
      console.log('[VISUALIZATION] conversation:end event received', data);
      
      if (data.emotionData) {
        setEmotionHistory(prev => [...prev, ...data.emotionData].slice(-100));
      }
      
      setRefreshKey(prev => prev + 1);
    });

    socket.on('user:message:complete', (data) => {
      console.log('[VISUALIZATION] user:message:complete event received');
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      socket.off('conversation:end');
      socket.off('user:message:complete');
    };
  }, [socket]);

  const normalizedPersonas = normalizeInfluenceScores(
    personas.map(p => ({
      personaId: p.id,
      personaName: p.name,
      messageCount: p.messageCount || 0,
      replyRate: p.replyRate || 0,
      connection: p.connection || 0,
      emotionImpact: p.emotionImpact || 0,
      influence: p.influence || 0,
      lastInteraction: p.lastInteraction || Date.now()
    }))
  ).map((p, idx) => ({
    ...personas[idx],
    influence: p.influence
  }));

  const chartData = {
    labels: emotionHistory.slice(-20).map((d, i) => 
      new Date(d.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: '긍정',
        data: emotionHistory.slice(-20).map(d => 
          ['empathetic', 'playful', 'enthusiastic'].includes(d.emotion) ? d.intensity : 0
        ),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: '중립',
        data: emotionHistory.slice(-20).map(d => 
          ['analytical', 'logical', 'contemplative'].includes(d.emotion) ? d.intensity : 0
        ),
        borderColor: '#9E9E9E',
        backgroundColor: 'rgba(158, 158, 158, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: '부정',
        data: emotionHistory.slice(-20).map(d => 
          ['critical', 'argumentative'].includes(d.emotion) ? d.intensity : 0
        ),
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
      },
    },
  };

  useEffect(() => {
    if (!svgRef.current || normalizedPersonas.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const graphData = buildGraphData(
      normalizedPersonas.map(p => ({
        id: p.id,
        name: p.name,
        mood: p.mood || 'neutral',
        influence: p.influence
      })),
      []
    );

    const positionedNodes = calculateNodePositions(graphData.nodes, width, height);

    const defs = svg.append("defs");
    positionedNodes.forEach(node => {
      const glowIntensity = getNodeGlowIntensity(node.influence);
      
      const filter = defs.append("filter")
        .attr("id", `glow-${node.id}`)
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

      filter.append("feGaussianBlur")
        .attr("stdDeviation", glowIntensity)
        .attr("result", "coloredBlur");

      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    });

    const nodeGroup = svg.append("g").attr("class", "nodes");

    const nodes = nodeGroup.selectAll("g")
      .data(positionedNodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodes.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.moodColor)
      .attr("filter", d => `url(#glow-${d.id})`)
      .style("cursor", "pointer")
      .attr("data-testid", d => `node-${d.id}`)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.size * 1.2);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.size);
      });

    nodes.append("text")
      .attr("dy", d => d.size + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(d => d.label);

    nodes.append("text")
      .attr("dy", d => d.size + 35)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .style("font-size", "10px")
      .style("opacity", "0.7")
      .text(d => `영향력: ${(d.influence * 100).toFixed(0)}%`);

  }, [normalizedPersonas]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">시각화</h1>
            <p className="text-sm text-muted-foreground">감정 타임라인과 영향력 맵</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline" data-testid="tab-timeline">감정 타임라인</TabsTrigger>
            <TabsTrigger value="influence" data-testid="tab-influence">영향력 맵</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>실시간 감정 변화</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]" data-testid="chart-emotion-timeline">
                  {emotionHistory.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      대화 데이터가 없습니다. 페르소나와 대화를 시작해보세요.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>최근 감정 기록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="list-emotion-history">
                  {emotionHistory.slice(-10).reverse().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.personaName}</span>
                        <span className="text-sm text-muted-foreground">{item.emotion}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
                      </span>
                    </div>
                  ))}
                  {emotionHistory.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      아직 감정 기록이 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="influence">
            <Card>
              <CardHeader>
                <CardTitle>페르소나 영향력 맵</CardTitle>
              </CardHeader>
              <CardContent>
                <svg
                  ref={svgRef}
                  className="w-full h-[500px]"
                  data-testid="svg-influence-map"
                />
                {normalizedPersonas.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    페르소나 데이터를 불러오는 중...
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {normalizedPersonas.map(persona => (
                <Card key={persona.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{persona.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">영향력</span>
                        <span className="font-medium">{(persona.influence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">메시지 수</span>
                        <span>{persona.messageCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">응답률</span>
                        <span>{((persona.replyRate || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
