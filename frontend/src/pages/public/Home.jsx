import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventApi, announcementApi, membershipApi } from "../../api";
import {
  Calendar,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Megaphone,
} from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    eventApi.getEvents().then((data) => setEvents((data || []).slice(0, 3))).catch(() => {});
    announcementApi.getAnnouncements().then((data) => setAnnouncements((data || []).slice(0, 3))).catch(() => {});
    membershipApi.getPlans().then((data) => setPlans(data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-slate-50/30 to-background border-b border-border py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>The Unified Student Organization Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1]">
                Empowering Campus <span className="text-teal-600">Leadership</span> & Student Life
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                EDVEXA brings together membership, ticket reservations, gate check-in, official merchandise, volunteer tasks, and financial governance in one connected ecosystem.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/events"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 shadow-sm transition-all"
                >
                  <span>Explore Campus Events</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-border text-slate-800 font-semibold text-sm hover:bg-slate-50 transition-all shadow-2xs"
                >
                  Join as Student Member
                </Link>
              </div>

              {/* Quick Platform Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 text-left">
                <div>
                  <div className="text-2xl font-bold text-foreground">1,400+</div>
                  <div className="text-xs text-muted-foreground">Active Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">48</div>
                  <div className="text-xs text-muted-foreground">Campus Events / Yr</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-600">100%</div>
                  <div className="text-xs text-muted-foreground">Transparent Ledger</div>
                </div>
              </div>
            </div>

            {/* Visual Hero Card */}
            <div className="lg:col-span-5">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-lg relative">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">EDVEXA Hub</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">HackEDVEXA 2026</div>
                        <div className="text-[11px] text-teal-700 font-medium">QR Ticket Verified</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-teal-700 bg-white px-2.5 py-1 rounded-md border border-teal-200">
                      Member $0.00
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Annual Gold Membership</div>
                        <div className="text-[11px] text-muted-foreground">20% Event & Merch Discount</div>
                      </div>
                    </div>
                    <StatusBadge status="ACTIVE" />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Volunteer Shift Log</div>
                        <div className="text-[11px] text-muted-foreground">Orientation Check-in Gate A</div>
                      </div>
                    </div>
                    <StatusBadge status="COMPLETED" />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>FastAPI + PostgreSQL Verified</span>
                  <span className="text-teal-600 font-medium">Authoritative State</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              Happening on Campus
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1">
              Upcoming Events & Workshops
            </h2>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            <span>View All Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col group"
            >
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/95 backdrop-blur-xs text-foreground text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs">
                    {event.category}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-teal-700 transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{new Date(event.startDate).toLocaleDateString()} • {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Tickets From</span>
                    <span className="text-sm font-bold text-teal-700">
                      ${event.ticketTypes?.[0]?.memberPrice !== undefined ? event.ticketTypes[0].memberPrice : event.ticketTypes?.[0]?.price || 0}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">(Member)</span>
                    </span>
                  </div>
                  <Link
                    to={`/events/${event.id}`}
                    className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-2xs"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Tiers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-teal-900 rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">
              Student Organization Membership
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              Unlock Free Tickets, 20% Merch Discounts & Voting Rights
            </h2>
            <p className="mt-3 text-sm text-teal-100/90 leading-relaxed">
              Membership fees directly fund hackathon prizes, lab hardware, and student travel grants. Every dollar is tracked in the public organization ledger.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 transition-all ${
                  plan.isPopular
                    ? "bg-white text-slate-900 shadow-xl ring-2 ring-teal-400"
                    : "bg-teal-800/80 text-white border border-teal-700"
                }`}
              >
                {plan.isPopular && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase tracking-wide mb-3">
                    Most Popular Choice
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">${plan.price}</span>
                  <span className={`text-xs ${plan.isPopular ? "text-slate-500" : "text-teal-200"}`}>
                    / {plan.durationMonths} months
                  </span>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.isPopular ? "text-teal-600" : "text-teal-300"
                        }`}
                      />
                      <span className={plan.isPopular ? "text-slate-700" : "text-teal-100"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/app/membership/plans"
                  className={`mt-6 block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold transition-colors ${
                    plan.isPopular
                      ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                      : "bg-white text-teal-900 hover:bg-teal-50"
                  }`}
                >
                  Join {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Official Announcements</h2>
              <p className="text-xs text-muted-foreground">Executive council briefings and campus updates</p>
            </div>
          </div>
          <Link
            to="/announcements"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {announcements.map((item) => (
            <Link
              key={item.id}
              to={`/announcements/${item.id}`}
              className="bg-card rounded-xl border border-border p-5 hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-semibold text-teal-700">{item.category}</span>
                  <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-sm text-foreground line-clamp-2">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground font-medium">
                By {item.author}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
