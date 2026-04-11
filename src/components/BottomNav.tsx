import { LayoutDashboard, Users, Car, Wallet, MessageSquare } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Pátio", url: "/yard", icon: Car },
  { title: "Caixa", url: "/cash-flow", icon: Wallet },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
];

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom">
    <div className="flex justify-around py-2">
      {items.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground text-[10px]"
          activeClassName="text-primary"
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);
