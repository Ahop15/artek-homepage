flowchart TB
    Start[Start] --> Analysis[Needs Analysis]
    Analysis --> Feasibility[Feasibility Study]
    Feasibility --> Planning[Project Planning]
    Planning --> Preparation[Application Preparation]
    Preparation --> Application[Ministry Application]
    Application --> Tracking[Application Tracking]
    Tracking --> Decision{Approval?}
    Decision -->|Yes| Setup[R&D / Design Center Setup]
    Decision -->|No| Revision[Revision]
    Revision --> Application
    Setup --> Operation[Operation Launch]
    Operation --> Support[Continuous Consulting]
    Support --> End[Completed]
