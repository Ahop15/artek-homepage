flowchart TB
    Start[Başlangıç] --> Analysis[İhtiyaç Analizi]
    Analysis --> Feasibility[Fizibilite Çalışması]
    Feasibility --> Planning[Proje Planlama]
    Planning --> Preparation[Başvuru Hazırlığı]
    Preparation --> Application[Bakanlık Başvurusu]
    Application --> Tracking[Başvuru Takibi]
    Tracking --> Decision{Onay?}
    Decision -->|Evet| Setup[Ar-Ge / Tasarım Merkezi Kurulumu]
    Decision -->|Hayır| Revision[Revizyon]
    Revision --> Application
    Setup --> Operation[Operasyon Başlangıcı]
    Operation --> Support[Sürekli Danışmanlık]
    Support --> End[Tamamlandı]