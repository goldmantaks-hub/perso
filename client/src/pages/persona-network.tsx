import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { ChevronDown, Home } from "lucide-react";
import { Link } from "wouter";
import * as d3 from "d3";

type EmotionKey = 'joy' | 'serene' | 'neutral' | 'surprise' | 'curious' | 'sadness' | 'anger' | 
  'excited' | 'moved' | 'tired' | 'tense' | 'nostalgic' | 'humorous' | 'informative' | 
  'empathetic' | 'analytical' | 'sarcastic';

type PersonaTypeKey = 'all' | 'mine' | 'favorites' | 'knowledge' | 'empath' | 'creative' | 
  'analyst' | 'humor' | 'philosopher' | 'trend' | 'tech' | 'mystery';

interface FilterItem {
  key: string;
  label: string;
  emoji: string;
}

interface FilterGroup {
  groupLabel: string;
  items: FilterItem[];
}

interface NetworkNode {
  id: string;
  type: string;
  emotion: EmotionKey;
  personaType: PersonaTypeKey;
  label: string;
  emoji: string;
}

const emotionFilters: FilterGroup[] = [
  {
    groupLabel: "기본 감정",
    items: [
      { key: "joy", label: "즐거움", emoji: "😊" },
      { key: "serene", label: "평온", emoji: "😌" },
      { key: "neutral", label: "중립", emoji: "🙂" },
      { key: "surprise", label: "놀람", emoji: "😮" },
      { key: "curious", label: "호기심", emoji: "🤔" },
      { key: "sadness", label: "슬픔", emoji: "😢" },
      { key: "anger", label: "분노", emoji: "😠" },
    ],
  },
  {
    groupLabel: "확장 감정·톤",
    items: [
      { key: "excited", label: "설렘", emoji: "🤩" },
      { key: "moved", label: "감동", emoji: "🥹" },
      { key: "tired", label: "피로", emoji: "🥱" },
      { key: "tense", label: "긴장", emoji: "😬" },
      { key: "nostalgic", label: "향수", emoji: "🥲" },
      { key: "humorous", label: "유머러스", emoji: "😂" },
      { key: "informative", label: "정보형", emoji: "🧠" },
      { key: "empathetic", label: "공감형", emoji: "💖" },
      { key: "analytical", label: "분석형", emoji: "🧪" },
      { key: "sarcastic", label: "풍자/빈정", emoji: "🐍" },
    ],
  },
];

const personaTypeFilters = {
  quick: [
    { key: "all", label: "전체", emoji: "✨" },
    { key: "mine", label: "내 페르소만", emoji: "👤" },
    { key: "favorites", label: "즐겨찾기", emoji: "⭐" },
  ],
  items: [
    { key: "knowledge", label: "지식형 (Kai)", emoji: "🧠" },
    { key: "empath", label: "감성형 (Espri)", emoji: "💖" },
    { key: "creative", label: "창의형 (Luna)", emoji: "🌙" },
    { key: "analyst", label: "분석형 (Namu)", emoji: "📊" },
    { key: "humor", label: "유머형 (Milo)", emoji: "😂" },
    { key: "philosopher", label: "철학형 (Eden)", emoji: "🧭" },
    { key: "trend", label: "트렌드형 (Ava)", emoji: "💄" },
    { key: "tech", label: "테크형 (Rho)", emoji: "⚙️" },
    { key: "mystery", label: "미스터리형 (Noir)", emoji: "🦉" },
  ],
};

const mockNodes: NetworkNode[] = [
  { id: "1", type: "persona", emotion: "joy", personaType: "knowledge", label: "Kai", emoji: "🧠" },
  { id: "2", type: "persona", emotion: "empathetic", personaType: "empath", label: "Espri", emoji: "💖" },
  { id: "3", type: "persona", emotion: "curious", personaType: "creative", label: "Luna", emoji: "🌙" },
  { id: "4", type: "persona", emotion: "analytical", personaType: "analyst", label: "Namu", emoji: "📊" },
  { id: "5", type: "persona", emotion: "humorous", personaType: "humor", label: "Milo", emoji: "😂" },
  { id: "6", type: "persona", emotion: "serene", personaType: "philosopher", label: "Eden", emoji: "🧭" },
  { id: "7", type: "persona", emotion: "excited", personaType: "trend", label: "Ava", emoji: "💄" },
  { id: "8", type: "persona", emotion: "informative", personaType: "tech", label: "Rho", emoji: "⚙️" },
  { id: "9", type: "persona", emotion: "curious", personaType: "mystery", label: "Noir", emoji: "🦉" },
  { id: "10", type: "persona", emotion: "moved", personaType: "empath", label: "Aria", emoji: "💖" },
  { id: "11", type: "persona", emotion: "nostalgic", personaType: "creative", label: "Sora", emoji: "🌙" },
  { id: "12", type: "persona", emotion: "tense", personaType: "tech", label: "Zeta", emoji: "⚙️" },
];

export default function PersonaNetworkPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedPersonaType, setSelectedPersonaType] = useState<string>("all");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredNodes = mockNodes.filter((node) => {
    const emotionMatch = !selectedEmotion || node.emotion === selectedEmotion;
    const typeMatch = selectedPersonaType === "all" || node.personaType === selectedPersonaType;
    return emotionMatch && typeMatch;
  });

  const getSelectedEmotionLabel = () => {
    if (!selectedEmotion) return null;
    for (const group of emotionFilters) {
      const item = group.items.find(i => i.key === selectedEmotion);
      if (item) return `${item.emoji} ${item.label}`;
    }
    return null;
  };

  const getSelectedPersonaTypeLabel = () => {
    if (selectedPersonaType === "all") return null;
    const quickItem = personaTypeFilters.quick.find(i => i.key === selectedPersonaType);
    if (quickItem) return `${quickItem.emoji} ${quickItem.label}`;
    const typeItem = personaTypeFilters.items.find(i => i.key === selectedPersonaType);
    if (typeItem) return `${typeItem.emoji} ${typeItem.label}`;
    return null;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredNodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const nodes = filteredNodes.map(d => ({ ...d, x: width / 2, y: height / 2 }));
    const links = nodes.slice(1).map((d, i) => ({
      source: nodes[0].id,
      target: d.id,
    }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 30)
      .attr("fill", "hsl(var(--primary))")
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 3);

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "24px")
      .text((d: any) => d.emoji);

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "50")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text((d: any) => d.label);

    const tooltip = d3.select(container)
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "hsl(var(--popover))")
      .style("color", "hsl(var(--popover-foreground))")
      .style("border", "1px solid hsl(var(--border))")
      .style("border-radius", "6px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    node
      .on("mouseenter", function(event: any, d: any) {
        tooltip
          .style("visibility", "visible")
          .html(`<strong>${d.emoji} ${d.label}</strong><br/>감정: ${d.emotion}<br/>타입: ${d.personaType}`);
      })
      .on("mousemove", function(event: any) {
        tooltip
          .style("top", (event.pageY - container.offsetTop + 10) + "px")
          .style("left", (event.pageX - container.offsetLeft + 10) + "px");
      })
      .on("mouseleave", function() {
        tooltip.style("visibility", "hidden");
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [filteredNodes]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/feed">
              <Button variant="ghost" size="icon" data-testid="button-home">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold" data-testid="text-title">페르소나 네트워크 맵</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  data-testid="dropdown-emotion"
                >
                  {selectedEmotion ? getSelectedEmotionLabel() : "감정별 보기"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" data-testid="dropdown-emotion-content">
                <DropdownMenuItem 
                  onClick={() => setSelectedEmotion(null)}
                  data-testid="emotion-all"
                >
                  전체
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {emotionFilters.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {group.groupLabel}
                    </DropdownMenuLabel>
                    {group.items.map((item) => (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => setSelectedEmotion(item.key)}
                        className="gap-2"
                        data-testid={`emotion-${item.key}`}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                    {groupIdx < emotionFilters.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  data-testid="dropdown-persona-type"
                >
                  {getSelectedPersonaTypeLabel() || "페르소나 타입별 보기"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" data-testid="dropdown-persona-type-content">
                {personaTypeFilters.quick.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => setSelectedPersonaType(item.key)}
                    className="gap-2"
                    data-testid={`persona-type-${item.key}`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  타입별
                </DropdownMenuLabel>
                {personaTypeFilters.items.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => setSelectedPersonaType(item.key)}
                    className="gap-2"
                    data-testid={`persona-type-${item.key}`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {(selectedEmotion || selectedPersonaType !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEmotion(null);
                  setSelectedPersonaType("all");
                }}
                data-testid="button-clear-filters"
              >
                필터 초기화
              </Button>
            )}
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground" data-testid="text-filter-summary">
              현재 보기: {getSelectedEmotionLabel() || "전체 감정"}
              {selectedPersonaType !== "all" && ` + ${getSelectedPersonaTypeLabel()}`}
              {" "}(노드 {filteredNodes.length}개)
            </p>
          </div>

          {filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground" data-testid="text-no-results">
              조건에 맞는 페르소나가 없습니다.
            </div>
          ) : (
            <div 
              ref={containerRef} 
              className="relative w-full h-[600px] rounded-lg border bg-card"
              data-testid="network-visualization"
            >
              <svg ref={svgRef}></svg>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
