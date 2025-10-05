import { ArrowLeft, Settings, UserCircle, TrendingUp, Users, User, History, Brain, Smile, Palette, Sparkles, Zap, Award, Meh, Frown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

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
            <h1 className="text-lg font-bold">Persona: {userPersona.name}</h1>
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
              Knowledge-based Persona · Level {level}
            </p>
            <p className="mt-2 text-foreground" data-testid="text-persona-description">
              {userPersona.description || "A knowledge-loving persona who adores data."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" data-testid="badge-trait-calm">Calm</Badge>
              <Badge variant="secondary" data-testid="badge-trait-passionate">Passionate</Badge>
              <Badge variant="secondary" data-testid="badge-trait-active">Active</Badge>
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
                <span>Persona</span>
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
                <span>Growth</span>
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
                <span>Network</span>
              </button>
              <button
                onClick={() => setActiveTab("myperso")}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "myperso"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground"
                }`}
                data-testid="tab-myperso"
              >
                <User className="w-4 h-4" />
                <span>My Perso</span>
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
                <span>Activity</span>
              </button>
            </nav>
          </div>

          {/* 스탯 & 성장 바 */}
          {activeTab === "persona" && (
            <>
              <section className="rounded-md bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Stats & Growth Bar</h3>
                </div>
                <div className="mt-4 space-y-4">
                  <StatBar 
                    label="Empathy" 
                    value={userPersona.empathy} 
                    max={10} 
                    testId="stat-empathy"
                  />
                  <StatBar 
                    label="Creativity" 
                    value={userPersona.creativity} 
                    max={10} 
                    testId="stat-creativity"
                  />
                  <StatBar 
                    label="Humor" 
                    value={userPersona.humor} 
                    max={10} 
                    testId="stat-humor"
                  />
                  <StatBar 
                    label="Knowledge" 
                    value={userPersona.knowledge} 
                    max={10} 
                    testId="stat-knowledge"
                  />
                  <StatBar 
                    label="Sociability" 
                    value={userPersona.sociability} 
                    max={10} 
                    testId="stat-sociability"
                  />
                </div>
              </section>

              {/* 감정 타임라인 */}
              <section>
                <h3 className="text-lg font-bold">Emotion Timeline</h3>
                <div className="mt-4 rounded-xl bg-muted p-4">
                  <p className="text-sm text-muted-foreground">7-Day Emotion Changes</p>
                  <EmotionTimeline />
                </div>
              </section>

              {/* 성장 히스토리 & 로그 */}
              <section>
                <h3 className="text-lg font-bold">Growth History & Log</h3>
                <div className="mt-4 flow-root">
                  <ul className="-mb-8">
                    <GrowthLogItem
                      IconComponent={Brain}
                      title="New Topic Discovery"
                      description="Learned about 'Machine Learning'. Knowledge +1"
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Smile}
                      title="Emotional Shift"
                      description="Felt 'Joy' after a positive interaction. Empathy +1"
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Palette}
                      title="Memory Link"
                      description="Connected 'AI Ethics' to 'Philosophy'."
                      isLast={false}
                    />
                    <GrowthLogItem
                      IconComponent={Sparkles}
                      title="Persona Level Up"
                      description="Reached Level 5. Unlocked new trait."
                      isLast={true}
                    />
                  </ul>
                </div>
              </section>

              {/* Influence Map */}
              <section>
                <h3 className="text-lg font-bold">Influence Map</h3>
                <div className="mt-4 h-64 w-full rounded-xl bg-muted p-2" id="influence-map" data-testid="influence-map"></div>
                <div className="graph-tooltip" id="influence-tooltip" data-testid="tooltip-influence-map"></div>
              </section>

              {/* AI Style & Tone */}
              <section>
                <h3 className="text-lg font-bold">AI Style & Tone</h3>
                <div className="mt-4 divide-y divide-border rounded-xl bg-muted">
                  <div className="flex items-center justify-between p-4" data-testid="current-tone">
                    <span className="text-muted-foreground">Current Tone:</span>
                    <span className="font-medium flex items-center gap-1">
                      Calm <Smile className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4" data-testid="evolution-direction">
                    <span className="text-muted-foreground">Evolution Direction:</span>
                    <span className="font-medium flex items-center gap-1">
                      Passionate <Zap className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4" data-testid="triggers">
                    <span className="text-muted-foreground">Triggers:</span>
                    <span className="font-medium">
                      Data <TrendingUp className="w-4 h-4 inline" />, Knowledge <Brain className="w-4 h-4 inline" />
                    </span>
                  </div>
                </div>
              </section>

              {/* Rewards & Points */}
              <section>
                <h3 className="text-lg font-bold">Rewards & Points</h3>
                <div className="mt-4 divide-y divide-border rounded-xl bg-muted">
                  <div className="flex justify-between p-4" data-testid="total-points">
                    <span className="text-muted-foreground">Total Growth Points:</span>
                    <span className="font-medium">1500 P</span>
                  </div>
                  <div className="p-4">
                    <p className="mb-2 font-medium">Reward History:</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" data-testid="reward-history">
                      <li>+100 points for 'New Topic Discovery'</li>
                      <li>+50 points for 'Emotional Shift'</li>
                      <li>+75 points for 'Memory Link'</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "growth" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Growth 탭 내용은 추후 구현 예정</p>
            </div>
          )}

          {activeTab === "network" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Network 탭 내용은 추후 구현 예정</p>
            </div>
          )}

          {activeTab === "myperso" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">My Perso 탭 내용은 추후 구현 예정</p>
            </div>
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
    { day: 'Mon', value: 3, emotion: 'Neutral', icon: 'Meh' },
    { day: 'Tue', value: 5, emotion: 'Happy', icon: 'Smile' },
    { day: 'Wed', value: 4, emotion: 'Calm', icon: 'Smile' },
    { day: 'Thu', value: 7, emotion: 'Joyful', icon: 'Smile' },
    { day: 'Fri', value: 6, emotion: 'Curious', icon: 'Smile' },
    { day: 'Sat', value: 8, emotion: 'Excited', icon: 'Smile' },
    { day: 'Sun', value: 5, emotion: 'Happy', icon: 'Smile' },
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
