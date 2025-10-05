import { ArrowLeft, Settings, UserCircle, TrendingUp, Users, User, History, Brain, Smile, Palette, Sparkles, Zap, Award, Meh, Frown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

interface InfluenceNode {
  id: string;
  group: number;
  radius: number;
  type: string;
  interactions?: number;
  sentiment?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface InfluenceLink {
  source: string | InfluenceNode;
  target: string | InfluenceNode;
  value: number;
}

function StatBar({ label, value, max, testId }: { label: string; value: number; max: number; testId: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-2">
      <p className="font-medium">{label}</p>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
          data-testid={`${testId}-bar`}
        ></div>
      </div>
      <p className="text-sm font-medium text-muted-foreground" data-testid={`${testId}-value`}>
        {value}/{max}
      </p>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-6 w-6 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
        data-testid={`${testId}-add`}
      >
        <span className="text-sm">+</span>
      </Button>
    </div>
  );
}

function GrowthLogItem({ IconComponent, title, description, isLast }: { IconComponent: any; title: string; description: string; isLast: boolean }) {
  return (
    <li>
      <div className="relative pb-8">
        {!isLast && (
          <span
            aria-hidden="true"
            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border"
          ></span>
        )}
        <div className="relative flex items-start space-x-3">
          <div>
            <div className="relative px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 ring-8 ring-background">
                <IconComponent className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm">
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmotionTimeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const emotionData = [
    { day: '월', value: 3, emotion: '보통', icon: 'Meh' },
    { day: '화', value: 5, emotion: '행복', icon: 'Smile' },
    { day: '수', value: 4, emotion: '차분함', icon: 'Smile' },
    { day: '목', value: 7, emotion: '기쁨', icon: 'Smile' },
    { day: '금', value: 6, emotion: '호기심', icon: 'Smile' },
    { day: '토', value: 8, emotion: '흥분', icon: 'Smile' },
    { day: '일', value: 5, emotion: '행복', icon: 'Smile' },
  ];

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !tooltipRef.current) return;

    const renderChart = () => {
      const svg = d3.select(svgRef.current);
      const tooltip = d3.select(tooltipRef.current);
      const container = containerRef.current;
      
      if (!container) return;

      svg.selectAll("*").remove();

      const width = container.clientWidth;
      const height = 192;
      const margin = { top: 20, right: 20, bottom: 30, left: 20 };

      const x = d3.scalePoint()
        .domain(emotionData.map(d => d.day))
        .range([margin.left, width - margin.right])
        .padding(0.5);

      const y = d3.scaleLinear()
        .domain([0, d3.max(emotionData, d => d.value)! + 2])
        .range([height - margin.bottom, margin.top]);

      const line = d3.line<typeof emotionData[0]>()
        .x(d => x(d.day)!)
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      const isDark = document.documentElement.classList.contains('dark');
      const primaryColor = "hsl(var(--primary))";
      const textColor = isDark ? "#e2e8f0" : "#475569";
      const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
        .attr("color", textColor)
        .select(".domain").remove();

      svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width + margin.left + margin.right).tickFormat("" as any))
        .attr("transform", `translate(${margin.left}, 0)`)
        .selectAll("line")
        .attr("stroke", gridColor)
        .attr("stroke-dasharray", "2,2");

      svg.select(".grid").select(".domain").remove();

      svg.append("path")
        .datum(emotionData)
        .attr("fill", "none")
        .attr("stroke", primaryColor)
        .attr("stroke-width", 2.5)
        .attr("d", line);

      const focus = svg.append("g")
        .attr("class", "focus")
        .style("display", "none");

      focus.append("circle")
        .attr("r", 6)
        .attr("fill", primaryColor)
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", 2);

      svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => {
          focus.style("display", null);
          tooltip.style("opacity", "0.9");
        })
        .on("mouseout", () => {
          focus.style("display", "none");
          tooltip.style("opacity", "0");
        })
        .on("mousemove", function(event) {
          const [mouseX] = d3.pointer(event);
          const domain = x.domain();
          const range = x.range();
          const rangePoints = domain.map(d => x(d)!);
          
          let closestIndex = 0;
          let minDistance = Math.abs(rangePoints[0] - mouseX);
          
          rangePoints.forEach((point, i) => {
            const distance = Math.abs(point - mouseX);
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = i;
            }
          });

          const d = emotionData[closestIndex];
          focus.attr("transform", `translate(${x(d.day)},${y(d.value)})`);

          const tooltipNode = tooltip.node() as HTMLElement;
          const tooltipWidth = tooltipNode?.offsetWidth || 0;
          const tooltipHeight = tooltipNode?.offsetHeight || 0;
          
          let left = event.pageX + 15;
          if (left + tooltipWidth > window.innerWidth - 20) {
            left = event.pageX - tooltipWidth - 15;
          }

          tooltip.html(`<strong>${d.day}</strong>: ${d.emotion}`)
            .style("left", `${left}px`)
            .style("top", `${event.pageY - tooltipHeight - 15}px`);
        });
    };

    renderChart();

    const resizeObserver = new ResizeObserver(() => {
      renderChart();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-48" data-testid="emotion-timeline">
      <svg ref={svgRef} className="w-full h-full" id="emotion-chart"></svg>
      <div 
        ref={tooltipRef}
        id="emotion-tooltip"
        data-testid="tooltip-emotion"
        className="absolute text-center px-2 py-1 text-xs bg-slate-700 text-white rounded-lg pointer-events-none opacity-0 transition-opacity"
        style={{ position: 'absolute' }}
      ></div>
    </div>
  );
}

function InfluenceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const influenceData: { nodes: InfluenceNode[]; links: InfluenceLink[] } = {
    nodes: [
      { id: "Kai", group: 0, radius: 25, type: "페르소나" },
      { id: "머신러닝", group: 1, radius: 18, type: "주제", interactions: 12 },
      { id: "AI 윤리", group: 1, radius: 15, type: "주제", interactions: 8 },
      { id: "철학", group: 2, radius: 12, type: "주제", interactions: 5 },
      { id: "긍정적 피드백", group: 3, radius: 20, type: "트리거", sentiment: "긍정적" },
      { id: "데이터 분석", group: 1, radius: 16, type: "스킬", interactions: 15 },
    ],
    links: [
      { source: "Kai", target: "머신러닝", value: 5 },
      { source: "Kai", target: "AI 윤리", value: 4 },
      { source: "AI 윤리", target: "철학", value: 3 },
      { source: "Kai", target: "긍정적 피드백", value: 6 },
      { source: "Kai", target: "데이터 분석", value: 7 },
      { source: "머신러닝", target: "데이터 분석", value: 4 },
    ],
  };

  useEffect(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const renderMap = () => {
      const container = containerRef.current;
      const tooltip = d3.select(tooltipRef.current);
      
      if (!container) return;

      d3.select(container).selectAll("svg").remove();

      const width = container.clientWidth;
      const height = 256;
      
      const isDark = document.documentElement.classList.contains('dark');
      const primaryColor = "#389cfa";
      const textColor = isDark ? "#e2e8f0" : "#1e293b";
      const linkColor = isDark ? "#475569" : "#cbd5e1";
      const nodeFillColor = isDark ? "#334155" : "#e2e8f0";

      const simulation = d3.forceSimulation(influenceData.nodes)
        .force("link", d3.forceLink(influenceData.links).id((d: any) => d.id).distance((d: any) => {
          const source = d.source as InfluenceNode;
          const target = d.target as InfluenceNode;
          return source.radius + target.radius + 40;
        }))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => d.radius + 5));

      const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height);

      const link = svg.append("g")
        .attr("stroke", linkColor)
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(influenceData.links)
        .join("line")
        .attr("stroke-width", (d: any) => Math.sqrt(d.value));

      const node = svg.append("g")
        .selectAll("g")
        .data(influenceData.nodes)
        .join("g")
        .call(drag(simulation) as any);

      node.append("circle")
        .attr("r", (d: any) => d.radius)
        .attr("fill", (d: any) => d.id === 'Kai' ? primaryColor : nodeFillColor)
        .attr("stroke", (d: any) => d.id === 'Kai' ? "none" : primaryColor)
        .attr("stroke-width", 1.5);

      node.append("text")
        .text((d: any) => d.id)
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("font-size", (d: any) => d.radius * 0.5 > 12 ? 12 : d.radius * 0.5)
        .attr("fill", (d: any) => d.id === 'Kai' ? 'white' : textColor)
        .style("pointer-events", "none");

      node.on("mouseover", (event: any, d: any) => {
        tooltip.transition().duration(200).style("opacity", "0.9");
        let tooltipContent = `<strong>${d.id}</strong><br/>유형: ${d.type}`;
        if (d.interactions) tooltipContent += `<br/>상호작용: ${d.interactions}`;
        if (d.sentiment) tooltipContent += `<br/>감정: ${d.sentiment}`;
        tooltip.html(tooltipContent)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 28}px`);
      }).on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", "0");
      });

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });

      function drag(simulation: d3.Simulation<InfluenceNode, undefined>) {
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

        return d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      }
    };

    renderMap();

    const resizeObserver = new ResizeObserver(() => {
      renderMap();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="h-64 w-full" data-testid="influence-map">
      <div 
        ref={tooltipRef}
        data-testid="tooltip-influence-map"
        className="absolute text-center px-2 py-1 text-xs bg-slate-700 text-white rounded-lg pointer-events-none opacity-0 transition-opacity"
        style={{ position: 'absolute' }}
      ></div>
    </div>
  );
}

export default function PersonaStatePage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("persona");

  const { data: userPersona, isLoading } = useQuery<any>({
    queryKey: ["/api/user/persona"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!userPersona) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">페르소나를 찾을 수 없습니다</p>
      </div>
    );
  }

  const level = Math.floor((userPersona.empathy + userPersona.humor + userPersona.sociability + userPersona.creativity + userPersona.knowledge) / 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/feed")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">페르소나: {userPersona.name}</h1>
            <Button size="icon" variant="ghost" data-testid="button-settings">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="space-y-8 p-4">
          {/* 프로필 섹션 */}
          <section className="text-center">
            <div className="mx-auto h-32 w-32 rounded-full overflow-hidden bg-muted">
              <Avatar className="h-full w-full" data-testid="avatar-persona">
                <AvatarImage src={userPersona.image} className="object-cover" />
                <AvatarFallback>{userPersona.name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <h2 className="mt-4 text-2xl font-bold" data-testid="text-persona-name">
              {userPersona.name}
            </h2>
            <p className="text-muted-foreground" data-testid="text-persona-info">
              지식 기반 페르소나 · 레벨 {level}
            </p>
            <p className="mt-2 text-foreground" data-testid="text-persona-description">
              {userPersona.description || "데이터를 사랑하는 지식형 페르소나입니다."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" data-testid="badge-trait-calm">차분함</Badge>
              <Badge variant="secondary" data-testid="badge-trait-passionate">열정적</Badge>
              <Badge variant="secondary" data-testid="badge-trait-active">활동적</Badge>
            </div>
          </section>

          {/* 탭 네비게이션 */}
          <div className="overflow-x-auto border-b border-border">
            <nav className="-mb-px flex space-x-2">
              <button
                onClick={() => setActiveTab("persona")}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "persona"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid="tab-persona"
              >
                <UserCircle className="w-4 h-4" />
                <span>페르소나</span>
              </button>
              <button
                onClick={() => setActiveTab("growth")}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "growth"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid="tab-growth"
              >
                <TrendingUp className="w-4 h-4" />
                <span>성장</span>
              </button>
              <button
                onClick={() => setActiveTab("network")}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "network"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid="tab-network"
              >
                <Users className="w-4 h-4" />
                <span>네트워크</span>
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "activity"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid="tab-activity"
              >
                <History className="w-4 h-4" />
                <span>활동</span>
              </button>
            </nav>
          </div>

          {/* 스탯 & 성장 바 */}
          {activeTab === "persona" && (
            <>
              <section className="rounded-md bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">스탯 & 성장 바</h3>
                </div>
                <div className="mt-4 space-y-4">
                  <StatBar 
                    label="공감" 
                    value={userPersona.empathy} 
                    max={10} 
                    testId="stat-empathy"
                  />
                  <StatBar 
                    label="창의성" 
                    value={userPersona.creativity} 
                    max={10} 
                    testId="stat-creativity"
                  />
                  <StatBar 
                    label="유머" 
                    value={userPersona.humor} 
                    max={10} 
                    testId="stat-humor"
                  />
                  <StatBar 
                    label="지식" 
                    value={userPersona.knowledge} 
                    max={10} 
                    testId="stat-knowledge"
                  />
                  <StatBar 
                    label="사교성" 
                    value={userPersona.sociability} 
                    max={10} 
                    testId="stat-sociability"
                  />
                </div>
              </section>

              {/* 감정 타임라인 */}
              <section>
                <h3 className="text-lg font-bold">감정 타임라인</h3>
                <div className="mt-4 rounded-xl bg-muted p-4">
                  <p className="text-sm text-muted-foreground">7일간 감정 변화</p>
                  <EmotionTimeline />
                </div>
              </section>

              {/* 성장 히스토리 & 로그 */}
              <section>
                <h3 className="text-lg font-bold">성장 히스토리 & 로그</h3>
                <div className="mt-4 flow-root">
                  <ul className="-mb-8">
                    <GrowthLogItem
                      IconComponent={Brain}
                      title="새로운 주제 발견"
                      description="'머신러닝'에 대해 학습했습니다. 지식 +1"
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Smile}
                      title="감정 변화"
                      description="긍정적인 상호작용 후 '기쁨'을 느꼈습니다. 공감 +1"
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Palette}
                      title="기억 연결"
                      description="'AI 윤리'를 '철학'과 연결했습니다."
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Sparkles}
                      title="페르소나 레벨업"
                      description="레벨 5에 도달했습니다. 새로운 특성을 잠금 해제했습니다."
                      isLast={true}
                    />
                  </ul>
                </div>
              </section>

              {/* Influence Map */}
              <section>
                <h3 className="text-lg font-bold">영향력 맵</h3>
                <div className="mt-4 rounded-xl bg-muted p-2">
                  <InfluenceMap />
                </div>
              </section>

              {/* AI Style & Tone */}
              <section>
                <h3 className="text-lg font-bold">AI 스타일 & 톤</h3>
                <div className="mt-4 divide-y divide-border rounded-xl bg-muted">
                  <div className="flex items-center justify-between p-4" data-testid="current-tone">
                    <span className="text-muted-foreground">현재 톤:</span>
                    <span className="font-medium flex items-center gap-1">
                      차분함 <Smile className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4" data-testid="evolution-direction">
                    <span className="text-muted-foreground">진화 방향:</span>
                    <span className="font-medium flex items-center gap-1">
                      열정적 <Zap className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4" data-testid="triggers">
                    <span className="text-muted-foreground">트리거:</span>
                    <span className="font-medium">
                      데이터 <TrendingUp className="w-4 h-4 inline" />, 지식 <Brain className="w-4 h-4 inline" />
                    </span>
                  </div>
                </div>
              </section>

              {/* Rewards & Points */}
              <section>
                <h3 className="text-lg font-bold">보상 & 포인트</h3>
                <div className="mt-4 divide-y divide-border rounded-xl bg-muted">
                  <div className="flex justify-between p-4" data-testid="total-points">
                    <span className="text-muted-foreground">총 성장 포인트:</span>
                    <span className="font-medium">1500 P</span>
                  </div>
                  <div className="p-4">
                    <p className="mb-2 font-medium">보상 히스토리:</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" data-testid="reward-history">
                      <li>+100 포인트 '새로운 주제 발견'</li>
                      <li>+50 포인트 '감정 변화'</li>
                      <li>+75 포인트 '기억 연결'</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "growth" && (
            <>
              {/* Total Growth Index */}
              <section className="p-6 space-y-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">전체 성장 지수</h2>
                  <span className="text-sm font-medium text-muted-foreground">75/100</span>
                </div>
                <div className="relative w-full h-40">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="text-muted"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="75, 100"
                      strokeLinecap="round"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">75</span>
                    <span className="text-sm text-muted-foreground">성장</span>
                  </div>
                </div>
              </section>

              {/* Emotion & Growth Chart */}
              <section className="p-6 space-y-4 rounded-xl bg-muted/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">감정 & 성장</h2>
                    <p className="text-sm text-muted-foreground">최근 30일</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span>감정</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                      <span>성장</span>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <svg
                    fill="none"
                    height="100%"
                    preserveAspectRatio="none"
                    viewBox="0 0 500 150"
                    width="100%"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M0 140 H500" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-border" />
                    <path d="M0 105 H500" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-border" />
                    <path d="M0 70 H500" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-border" />
                    <path d="M0 35 H500" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-border" />
                    <path d="M0 0 H500" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-border" />
                    <path
                      d="M25 109 C75 21, 125 41, 175 93, 225 33, 275 101, 325 61, 375 121, 425 1, 475 81"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                      className="text-muted-foreground"
                    />
                    <path
                      d="M25 120 C75 100, 125 130, 175 110, 225 140, 275 90, 325 100, 375 60, 425 90, 475 50"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                      className="text-primary"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10월 1일</span>
                  <span>10월 8일</span>
                  <span>10월 15일</span>
                  <span>10월 22일</span>
                  <span>10월 29일</span>
                </div>
              </section>

              {/* Recent Growth Events */}
              <section>
                <h2 className="px-2 pb-2 text-lg font-semibold">최근 성장 이벤트</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">2025.10.03</p>
                    <div className="text-sm font-medium">
                      <span className="text-green-500">공감 +1</span> / <span className="text-green-500">유머 +1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">2025.10.02</p>
                    <div className="text-sm font-medium">
                      <span className="text-green-500">창의성 +2</span> / <span className="text-green-500">지식 +1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">2025.10.01</p>
                    <div className="text-sm font-medium">
                      <span className="text-green-500">사교성 +1</span> / <span className="text-green-500">공감 +1</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* AI Insight */}
              <section>
                <h2 className="px-2 pb-2 text-lg font-semibold">AI 인사이트</h2>
                <div className="p-4 rounded-lg bg-primary/10 text-primary">
                  <p className="font-medium">최근 당신의 페르소나는 감정형 성장 패턴을 보입니다.</p>
                  <p className="text-sm opacity-80">Recently, your persona has shown an emotional growth pattern.</p>
                </div>
              </section>
            </>
          )}

          {activeTab === "network" && (
            <>
              {/* Network Map Header */}
              <section>
                <h2 className="text-xl font-bold">페르소나 네트워크 맵</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  나와 다른 페르소나의 관계를 시각적으로 확인해보세요.
                </p>
              </section>

              {/* Network Visualization */}
              <section className="relative aspect-square w-full rounded-lg bg-muted/50 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400">
                  <line className="stroke-current text-muted" strokeWidth="6" x1="200" x2="200" y1="152" y2="120" />
                  <line className="stroke-current text-muted" strokeWidth="2" x1="176" x2="104" y1="176" y2="162" />
                  <line className="stroke-current text-muted" strokeWidth="4" x1="171.1" x2="145.7" y1="228.9" y2="265.7" />
                  <line className="stroke-current text-muted" strokeWidth="1.5" x1="222.9" x2="279.4" y1="222.9" y2="280.9" />
                  <line className="stroke-current text-muted" strokeWidth="3" x1="224" x2="295.4" y1="200" y2="189.6" />
                </svg>
                
                {/* Center Node - My Persona */}
                <div className="absolute z-10" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white font-bold text-center text-lg leading-tight">
                      나의<br />페르소나
                    </div>
                  </div>
                </div>

                {/* Connected Nodes */}
                <div className="absolute group z-10" style={{ top: '80px', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                      Milo
                    </div>
                    <div className="hidden group-hover:block absolute -bottom-14 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 text-center">
                      Milo와의 공감도 0.75 / 최근 5회 대화
                    </div>
                  </div>
                </div>

                <div className="absolute group z-10" style={{ top: '150px', left: '80px', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-red-400 flex items-center justify-center text-white font-bold text-xs">
                      Alex
                    </div>
                    <div className="hidden group-hover:block absolute -bottom-14 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 text-center">
                      Alex와의 공감도 0.45 / 최근 2회 대화
                    </div>
                  </div>
                </div>

                <div className="absolute group z-10" style={{ top: '280px', left: '120px', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
                      Nara
                    </div>
                    <div className="hidden group-hover:block absolute -bottom-14 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 text-center">
                      Nara와의 공감도 0.68 / 최근 4회 대화
                    </div>
                  </div>
                </div>

                <div className="absolute group z-10" style={{ top: '290px', left: '300px', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-black font-bold text-xs">
                      Leo
                    </div>
                    <div className="hidden group-hover:block absolute -bottom-14 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 text-center">
                      Leo와의 공감도 0.55 / 최근 1회 대화
                    </div>
                  </div>
                </div>

                <div className="absolute group z-10" style={{ top: '180px', left: '320px', transform: 'translate(-50%, -50%)' }}>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                      Luna
                    </div>
                    <div className="hidden group-hover:block absolute -bottom-14 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 text-center">
                      Luna와의 공감도 0.82 / 최근 3회 대화
                    </div>
                  </div>
                </div>
              </section>

              {/* Filter Buttons */}
              <section className="flex flex-wrap gap-2">
                <button className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20">
                  <span>감정별 보기</span>
                  <span>▼</span>
                </button>
                <button className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20">
                  <span>페르소나 타입별 보기</span>
                  <span>▼</span>
                </button>
              </section>

              {/* Insight Box */}
              <section className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                <div className="flex items-start gap-4">
                  <Award className="mt-1 text-primary w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-bold text-primary">인사이트 박스</p>
                    <p className="mt-1 text-sm">Milo는 최근 유머형 대화가 급증했습니다.</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "activity" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Activity 탭 내용은 추후 구현 예정</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
