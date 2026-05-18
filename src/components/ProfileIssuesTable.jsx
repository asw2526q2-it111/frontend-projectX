import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../context/currentUser";

export function ProfileIssuesTable({ username, type }) {
  const { currentUser } = useCurrentUser();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  const [sort, setSort] = useState("updated"); 
  const [dir, setDir] = useState("desc");      

  useEffect(() => {
    
    const fetchIssues = async () => {
      setLoading(true);
      try {
        
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/users/${username}/${type}/?sort=${sort}&dir=${dir}`;
        
        const response = await fetch(url, {
          headers: {
            "X-API-Key": currentUser?.apiKey,
            "Content-Type": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setIssues(data.results || data); 
        } else {
          console.error("Error carregant les incidències", response.status);
        }
      } catch (error) {
        console.error("Error de xarxa:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [username, type, sort, dir, currentUser?.apiKey]);

  
  const handleSort = (columnName) => {
    if (sort === columnName) {
      
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      
      setSort(columnName);
      setDir("asc");
    }
  };

  
  const renderSortIndicator = (columnName) => {
    if (sort !== columnName) return <span style={{ opacity: 0.2, marginLeft: '5px' }}>↕</span>;
    return dir === "asc" ? <span style={{ marginLeft: '5px' }}>↑</span> : <span style={{ marginLeft: '5px' }}>↓</span>;
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Carregant incidències...</div>;

  if (issues.length === 0) return <div className="profile-empty" style={{ padding: "2rem", textAlign: "center", color: "#617487" }}>No s'han trobat incidències.</div>;

  return (
    <div className="issues-table">
      {/* CAPÇALERA ORDENABLE */}
      <div className="issues-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '1rem', borderBottom: '2px solid #dde6ee', fontWeight: 'bold', color: '#617487' }}>
        <div style={{ cursor: "pointer" }} onClick={() => handleSort("title")}>
          Issue {renderSortIndicator("title")}
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
          Status {renderSortIndicator("status")}
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => handleSort("updated")}>
          Modified {renderSortIndicator("updated")}
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => handleSort("assignee")}>
          Assignee {renderSortIndicator("assignee")}
        </div>
      </div>

      {/* LLISTA D'INCIDÈNCIES */}
      <div>
        {issues.map(issue => (
          <div key={issue.id} className="issues-table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '1rem', borderBottom: '1px solid #dde6ee', alignItems: 'center' }}>
            <div className="issues-table-cell--title">
              <Link to={`/issues/${issue.id}`} style={{ textDecoration: 'none', color: '#1f2d3d', fontWeight: '600' }}>
                <span style={{ color: '#617487', marginRight: '8px' }}>#{issue.id}</span>
                {issue.title}
              </Link>
            </div>
            <div className="issues-table-cell--status">
              <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {issue.status?.name || issue.status || '-'}
              </span>
            </div>
            <div className="issues-table-cell--modified" style={{ color: '#617487', fontSize: '0.9rem' }}>
              {new Date(issue.updated_at || issue.created_at).toLocaleDateString()}
            </div>
            <div className="issues-table-cell--assignee">
              {issue.assignee?.username || issue.assigned_to || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}