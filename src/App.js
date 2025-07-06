import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import Papa from 'papaparse';

const DynamicLeadTimeDashboard = () => {
  const [data, setData] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [typeFilters, setTypeFilters] = useState({});
  const [showP85, setShowP85] = useState(true);
  const [showP95, setShowP95] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [fileName, setFileName] = useState('');

  // Cores predefinidas e automáticas
  const getColorForType = (type, index) => {
    const predefinedColors = {
      'User Story': '#3b82f6',
      'Bug': '#ef4444'
    };
    
    if (predefinedColors[type]) {
      return predefinedColors[type];
    }
    
    // Cores automáticas para outros tipos
    const autoColors = ['#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];
    return autoColors[index % autoColors.length];
  };

  // Cores para backgrounds dos botões
  const getBackgroundColorForType = (type, index) => {
    const predefinedBgs = {
      'User Story': { active: 'bg-blue-100 text-blue-800', inactive: 'bg-gray-100 text-gray-500' },
      'Bug': { active: 'bg-red-100 text-red-800', inactive: 'bg-gray-100 text-gray-500' }
    };
    
    if (predefinedBgs[type]) {
      return predefinedBgs[type];
    }
    
    // Backgrounds automáticos
    const autoBgs = [
      { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-yellow-100 text-yellow-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-purple-100 text-purple-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-orange-100 text-orange-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-cyan-100 text-cyan-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-lime-100 text-lime-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-pink-100 text-pink-800', inactive: 'bg-gray-100 text-gray-500' },
      { active: 'bg-indigo-100 text-indigo-800', inactive: 'bg-gray-100 text-gray-500' }
    ];
    
    return autoBgs[index % autoBgs.length];
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      // Validar extensão do arquivo
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('❌ Arquivo inválido! Por favor, selecione apenas arquivos .csv');
        setLoading(false);
        return;
      }
      
      // Salvar nome do arquivo
      setFileName(file.name);
      
      const csvContent = await file.text();
      await processCSV(csvContent);
      setCsvUploaded(true);
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError('Erro ao processar o arquivo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processCSV = async (csvContent) => {
    // Parse do CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';']
    });

    if (parsed.errors.length > 0) {
      console.warn('Avisos no parse CSV:', parsed.errors);
    }

    // Validar estrutura do CSV
    const requiredColumns = ['ID', 'Tipo de Item', 'Commited Date', 'Closed Date'];
    const headers = parsed.meta.fields || [];
    
    // Verificar se todas as colunas obrigatórias estão presentes
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(
        `❌ Estrutura do CSV inválida!\n\n` +
        `Colunas obrigatórias faltando:\n${missingColumns.join(', ')}\n\n` +
        `Estrutura esperada:\nID, Tipo de Item, Commited Date, Closed Date\n\n` +
        `Estrutura encontrada:\n${headers.join(', ')}`
      );
    }

    // Verificar se há dados válidos
    const validRows = parsed.data.filter(row => 
      row.ID && 
      row['Tipo de Item'] && 
      row['Commited Date'] && 
      row['Closed Date']
    );

    if (validRows.length === 0) {
      throw new Error(
        `❌ Nenhum dado válido encontrado!\n\n` +
        `Verifique se o CSV possui:\n` +
        `• Pelo menos uma linha de dados\n` +
        `• Valores preenchidos em todas as colunas obrigatórias\n` +
        `• Datas no formato correto (YYYY-MM-DD)`
      );
    }

    if (validRows.length < parsed.data.length) {
      console.warn(`Atenção: ${parsed.data.length - validRows.length} linhas foram ignoradas por dados incompletos`);
    }

    // Processar dados e calcular lead time
    const processedData = validRows.map(row => {
      const id = String(row.ID).trim();
      const type = String(row['Tipo de Item']).trim();
      
      // Validar e converter datas
      const commitedDate = new Date(String(row['Commited Date']).trim());
      const closedDate = new Date(String(row['Closed Date']).trim());
      
      // Verificar se as datas são válidas
      if (isNaN(commitedDate.getTime()) || isNaN(closedDate.getTime())) {
        throw new Error(
          `❌ Data inválida encontrada!\n\n` +
          `Linha com ID: ${id}\n` +
          `Commited Date: ${row['Commited Date']}\n` +
          `Closed Date: ${row['Closed Date']}\n\n` +
          `Use o formato: YYYY-MM-DD (ex: 2025-01-15)`
        );
      }
      
      // Verificar se Closed Date >= Commited Date
      if (closedDate < commitedDate) {
        throw new Error(
          `❌ Data inconsistente encontrada!\n\n` +
          `Linha com ID: ${id}\n` +
          `Closed Date (${row['Closed Date']}) é anterior ao Commited Date (${row['Commited Date']})\n\n` +
          `A data de conclusão deve ser igual ou posterior à data de início.`
        );
      }
      
      // Calcular lead time: (Closed Date - Commited Date) + 1
      const timeDiff = closedDate.getTime() - commitedDate.getTime();
      const leadTime = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        id,
        type,
        commitedDate,
        closedDate,
        leadTime,
        dateFormatted: closedDate.toLocaleDateString('pt-BR'),
        timestamp: closedDate.getTime()
      };
    }).sort((a, b) => a.timestamp - b.timestamp);

    // Extrair tipos únicos
    const uniqueTypes = [...new Set(processedData.map(item => item.type))];
    
    // Inicializar filtros (todos ativos por padrão)
    const initialFilters = {};
    uniqueTypes.forEach(type => {
      initialFilters[type] = true;
    });

    setData(processedData);
    setItemTypes(uniqueTypes);
    setTypeFilters(initialFilters);
  };

  useEffect(() => {
    // Tentar carregar arquivo automático primeiro, senão mostrar upload
    const tryAutoLoad = async () => {
      try {
        const csvContent = await window.fs.readFile('BaseClaude.csv', { encoding: 'utf8' });
        setFileName('BaseClaude.csv');
        await processCSV(csvContent);
        setCsvUploaded(true);
      } catch (err) {
        // Se não conseguir carregar automaticamente, mostrar interface de upload
        console.log('Arquivo não encontrado automaticamente, esperando upload do usuário');
      }
    };

    tryAutoLoad();
  }, []);

  // Formatar datas para o eixo X
  const formatXAxisDate = (tickItem) => {
    const date = new Date(tickItem);
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  };

  // Filtrar dados baseado nos filtros ativos
  const filteredData = data.filter(item => typeFilters[item.type]);

  // Calcular percentis baseado nos dados filtrados
  const filteredLeadTimes = filteredData.map(item => item.leadTime).sort((a, b) => a - b);
  const p85Index = Math.floor(filteredLeadTimes.length * 0.85);
  const p95Index = Math.floor(filteredLeadTimes.length * 0.95);
  const p85Value = filteredLeadTimes.length > 0 ? filteredLeadTimes[p85Index] : 0;
  const p95Value = filteredLeadTimes.length > 0 ? filteredLeadTimes[p95Index] : 0;

  // Agrupar dados por tipo para o scatter
  const dataByType = itemTypes.map((type, index) => ({
    type,
    data: filteredData.filter(item => item.type === type),
    color: getColorForType(type, index),
    visible: typeFilters[type]
  }));

  // Toggle de filtro por tipo
  const toggleTypeFilter = (type) => {
    setTypeFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (loading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Processando CSV...</p>
        </div>
      </div>
    );
  }

  return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{data.id}</p>
          <p className="text-sm">Tipo: {data.type}</p>
          <p className="text-sm">Commited: {data.commitedDate.toLocaleDateString('pt-BR')}</p>
          <p className="text-sm">Closed: {data.dateFormatted}</p>
          <p className="text-sm">Lead Time: {data.leadTime} dias</p>
        </div>
      );
    }
    return null;
  };

  if (!csvUploaded && !loading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-blue-500 text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard Lead Time</h2>
          <p className="text-gray-600 text-sm mb-6">
            Faça upload de um CSV com as colunas:<br/>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              ID, Tipo de Item, Commited Date, Closed Date
            </code>
          </p>
          
          <div className="mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors inline-block"
            >
              📁 Selecionar Arquivo CSV
            </label>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <div className="font-semibold mb-2">Erro na validação:</div>
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dispersão do Lead Time</h1>
          <button
            onClick={() => {
              setCsvUploaded(false);
              setData([]);
              setItemTypes([]);
              setTypeFilters({});
              setError(null);
              setFileName('');
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            ⬅️ Importar Novo CSV
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {itemTypes.map((type, index) => {
                const typeCount = data.filter(item => item.type === type).length;
                const bgColors = getBackgroundColorForType(type, index);
                const color = getColorForType(type, index);
                
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`flex items-center px-3 py-1 rounded transition-all ${
                      typeFilters[type] ? bgColors.active : bgColors.inactive
                    }`}
                  >
                    <div 
                      className={`w-3 h-3 rounded-full mr-2`}
                      style={{ backgroundColor: typeFilters[type] ? color : '#9ca3af' }}
                    ></div>
                    <span>{type} ({typeCount})</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex space-x-4 text-sm">
              {filteredData.length > 0 && (
                <>
                  <button
                    onClick={() => setShowP85(!showP85)}
                    className={`flex items-center px-3 py-1 rounded transition-all ${
                      showP85 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-0.5 mr-2 ${showP85 ? 'bg-orange-500' : 'bg-gray-400'}`} style={{borderTop: showP85 ? '2px dashed #ff9500' : '2px dashed #9ca3af'}}></div>
                    <span>P85: {p85Value} dias</span>
                  </button>
                  <button
                    onClick={() => setShowP95(!showP95)}
                    className={`flex items-center px-3 py-1 rounded transition-all ${
                      showP95 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-0.5 mr-2 ${showP95 ? 'bg-red-600' : 'bg-gray-400'}`} style={{borderTop: showP95 ? '2px dashed #ff0000' : '2px dashed #9ca3af'}}></div>
                    <span>P95: {p95Value} dias</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              type="number" 
              dataKey="timestamp" 
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisDate}
              angle={0}
              textAnchor="middle"
              height={60}
              stroke="#666"
              ticks={(() => {
                if (filteredData.length === 0) return [];
                
                // Gerar ticks para cada mês no período dos dados
                const minDate = new Date(Math.min(...filteredData.map(d => d.timestamp)));
                const maxDate = new Date(Math.max(...filteredData.map(d => d.timestamp)));
                
                const ticks = [];
                const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                
                while (current <= maxDate) {
                  ticks.push(current.getTime());
                  current.setMonth(current.getMonth() + 1);
                }
                
                return ticks;
              })()}
            />
            <YAxis 
              type="number" 
              dataKey="leadTime" 
              domain={[0, 'dataMax']}
              label={{ value: 'Lead Time (dias)', angle: -90, position: 'insideLeft' }}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {dataByType.map(({ type, data, color, visible }) => 
              visible && data.length > 0 && (
                <Scatter 
                  key={type}
                  name={type}
                  data={data} 
                  fill={color}
                  r={6}
                />
              )
            )}
            
            {filteredData.length > 0 && (
              <>
                {showP85 && (
                  <ReferenceLine 
                    y={p85Value} 
                    stroke="#ff9500" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `P85: ${p85Value}d`, position: 'insideTopRight' }}
                  />
                )}
                {showP95 && (
                  <ReferenceLine 
                    y={p95Value} 
                    stroke="#ff0000" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `P95: ${p95Value}d`, position: 'insideTopRight' }}
                  />
                )}
              </>
            )}
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-auto gap-4 text-sm" style={{gridTemplateColumns: `repeat(${Math.min(itemTypes.length + 1, 5)}, minmax(200px, 1fr))`}}>
          {itemTypes.map((type, index) => {
            const typeData = data.filter(item => item.type === type);
            const isVisible = typeFilters[type];
            const color = getColorForType(type, index);
            
            if (!isVisible || typeData.length === 0) return null;
            
            return (
              <div key={type} className="p-4 rounded-lg border" style={{backgroundColor: `${color}10`, borderColor: `${color}40`}}>
                <h3 className="font-semibold mb-2" style={{color: color}}>{type}</h3>
                <p>Lead Time Médio: {Math.round(typeData.reduce((sum, item) => sum + item.leadTime, 0) / typeData.length)} dias</p>
                <p>Min: {Math.min(...typeData.map(item => item.leadTime))} dias</p>
                <p>Max: {Math.max(...typeData.map(item => item.leadTime))} dias</p>
                <p>Total: {typeData.length} itens</p>
              </div>
            );
          })}
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Resumo Geral</h3>
            {filteredData.length > 0 && (
              <p>Lead Time Médio: {Math.round(filteredData.reduce((sum, item) => sum + item.leadTime, 0) / filteredData.length)} dias</p>
            )}
            <p>Total: {data.length} itens</p>
            <p>Tipos: {itemTypes.length}</p>
            <p>Fonte: {fileName || 'Arquivo CSV'}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
          <div className="mb-2">
            <span>por</span>
            <span className="font-semibold mx-1">Marcelo Souza</span>
            <span>· IA aplicada à Agilidade e Produto</span>
          </div>
          <a 
            href="https://www.linkedin.com/in/marcelotrindadesouza/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            /marcelotrindadesouza
          </a>
        </div>
      </div>
    </div>
  );
};

export default DynamicLeadTimeDashboard;
