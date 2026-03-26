import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { TeamHierarchyProvider } from "@/contexts/TeamHierarchyContext";
import { SimulationBanner } from "@/components/layout/SimulationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ForcePasswordChange } from "@/components/auth/ForcePasswordChange";

// Route-level code splitting: only load screens when visited.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Templates = lazy(() => import("./pages/Templates"));
const ProcessSettings = lazy(() => import("./pages/ProcessSettings"));
const SubProcessSettings = lazy(() => import("./pages/SubProcessSettings"));
const Projects = lazy(() => import("./pages/Projects"));
const Admin = lazy(() => import("./pages/Admin"));
const Workload = lazy(() => import("./pages/Workload"));
const Requests = lazy(() => import("./pages/Requests"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Chat = lazy(() => import("./pages/Chat"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SupplierReference = lazy(() => import("./pages/SupplierReference"));
const ProcessTracking = lazy(() => import("./pages/ProcessTracking"));
const Innovation = lazy(() => import("./pages/Innovation"));
const InnovationRequests = lazy(() => import("./pages/InnovationRequests"));
const KeonDashboard = lazy(() => import("./pages/KeonDashboard"));

// BE Project Hub pages
const BEProjectHubOverview = lazy(() => import("./pages/be/BEProjectHubOverview"));
const BEProjectHubTimeline = lazy(() => import("./pages/be/BEProjectHubTimeline"));
const BEProjectHubDiscussions = lazy(() => import("./pages/be/BEProjectHubDiscussions"));
const BEProjectHubFiles = lazy(() => import("./pages/be/BEProjectHubFiles"));
const BEProjectHubQuestionnaire = lazy(() => import("./pages/be/BEProjectHubQuestionnaire"));
const BEProjectHubKeonSynthese = lazy(() => import("./pages/be/BEProjectHubKeonSynthese"));

// IT Project Hub pages
const ITProjects = lazy(() => import("./pages/it/ITProjects"));
const ITProjectImportFDR = lazy(() => import("./pages/it/ITProjectImportFDR"));
const ITProjectHubOverview = lazy(() => import("./pages/it/ITProjectHubOverview"));
const ITProjectHubTasks = lazy(() => import("./pages/it/ITProjectHubTasks"));
const ITProjectHubTimeline = lazy(() => import("./pages/it/ITProjectHubTimeline"));
const ITProjectHubSync = lazy(() => import("./pages/it/ITProjectHubSync"));
const ITProjectHubDiscussions = lazy(() => import("./pages/it/ITProjectHubDiscussions"));
const ITProjectHubFiles = lazy(() => import("./pages/it/ITProjectHubFiles"));

const App = () => (
    <AuthProvider>
      <SimulationProvider>
        <PermissionsProvider>
        <TeamHierarchyProvider>
        <TooltipProvider>
          <ForcePasswordChange>
            <SimulationBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
            <Suspense
              fallback={
                <div className="min-h-[40vh] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Chargement…</div>
                </div>
              }
            >
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/process/:processId"
              element={
                <ProtectedRoute>
                  <ProcessSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/subprocess/:subProcessId"
              element={
                <ProtectedRoute>
                  <SubProcessSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workload"
              element={
                <ProtectedRoute>
                  <Workload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <Requests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="/design-system" element={<DesignSystem />} />
            {/* Old workflow editor routes removed — config is now in SubProcessSettings */}
            {/* BE Project Hub routes */}
            <Route
              path="/be/projects/:code/overview"
              element={
                <ProtectedRoute>
                  <BEProjectHubOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/be/projects/:code/questionnaire"
              element={
                <ProtectedRoute>
                  <BEProjectHubQuestionnaire />
                </ProtectedRoute>
              }
            />
            <Route
              path="/be/projects/:code/keon-synthese"
              element={
                <ProtectedRoute>
                  <BEProjectHubKeonSynthese />
                </ProtectedRoute>
              }
            />
            <Route
              path="/be/projects/:code/timeline"
              element={
                <ProtectedRoute>
                  <BEProjectHubTimeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/be/projects/:code/discussions"
              element={
                <ProtectedRoute>
                  <BEProjectHubDiscussions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/be/projects/:code/files"
              element={
                <ProtectedRoute>
                  <BEProjectHubFiles />
                </ProtectedRoute>
              }
            />
            {/* SPV Project Hub routes (same pages, SPV URL namespace) */}
            <Route
              path="/spv/projects/:code/overview"
              element={
                <ProtectedRoute>
                  <BEProjectHubOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spv/projects/:code/questionnaire"
              element={
                <ProtectedRoute>
                  <BEProjectHubQuestionnaire />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spv/projects/:code/keon-synthese"
              element={
                <ProtectedRoute>
                  <BEProjectHubKeonSynthese />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spv/projects/:code/timeline"
              element={
                <ProtectedRoute>
                  <BEProjectHubTimeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spv/projects/:code/discussions"
              element={
                <ProtectedRoute>
                  <BEProjectHubDiscussions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spv/projects/:code/files"
              element={
                <ProtectedRoute>
                  <BEProjectHubFiles />
                </ProtectedRoute>
              }
            />
            {/* Supplier Reference */}
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <SupplierReference />
                </ProtectedRoute>
              }
            />
            {/* Process Tracking */}
            <Route
              path="/process-tracking"
              element={
                <ProtectedRoute>
                  <ProcessTracking />
                </ProtectedRoute>
              }
            />
            {/* Innovation */}
            <Route
              path="/innovation"
              element={
                <ProtectedRoute>
                  <Innovation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/innovation/requests"
              element={
                <ProtectedRoute>
                  <InnovationRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/innovation/requests/:id"
              element={
                <ProtectedRoute>
                  <InnovationRequests />
                </ProtectedRoute>
              }
            />
              {/* SPV Dashboard */}
              <Route path="/spv" element={<ProtectedRoute><KeonDashboard /></ProtectedRoute>} />
              {/* IT Projects routes */}
              <Route path="/it/projects" element={<ProtectedRoute><ITProjects /></ProtectedRoute>} />
              <Route path="/it/projects/import-fdr" element={<ProtectedRoute><ITProjectImportFDR /></ProtectedRoute>} />
              <Route path="/it/projects/:code/overview" element={<ProtectedRoute><ITProjectHubOverview /></ProtectedRoute>} />
              <Route path="/it/projects/:code/tasks" element={<ProtectedRoute><ITProjectHubTasks /></ProtectedRoute>} />
              <Route path="/it/projects/:code/timeline" element={<ProtectedRoute><ITProjectHubTimeline /></ProtectedRoute>} />
              <Route path="/it/projects/:code/sync" element={<ProtectedRoute><ITProjectHubSync /></ProtectedRoute>} />
              <Route path="/it/projects/:code/discussions" element={<ProtectedRoute><ITProjectHubDiscussions /></ProtectedRoute>} />
              <Route path="/it/projects/:code/files" element={<ProtectedRoute><ITProjectHubFiles /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </BrowserRouter>
          </ForcePasswordChange>
        </TooltipProvider>
        </TeamHierarchyProvider>
        </PermissionsProvider>
      </SimulationProvider>
    </AuthProvider>
);

export default App;
