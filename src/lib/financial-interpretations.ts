import { CalculationSummary } from './german-method-calculator';

export interface FinancialInterpretations {
  priceRendimiento: string;
  convexidad: string;
  duracionModificada: string;
  volatilidad?: string;
  precioActual: string;
  utilidadPerdida: string;
  tceaEmisor: string;
  tceaEmisorEscudo: string;
  treaBonista: string;
  conclusionGeneral: string;
}

export function generateFinancialInterpretations(
  summary: CalculationSummary,
  nominalValue: number,
  comercialValue: number,
  cok: number
): FinancialInterpretations {
  const {
    duration,
    modifiedDuration,
    convexity,
    actualPrice,
    utility,
    emitterTCEA,
    emitterTCEAWithShield,
    bondholderTREA
  } = summary;

  // Convert Decimal values to numbers for calculations
  const durationNum = Number(duration.toString());
  const modifiedDurationNum = Number(modifiedDuration.toString());
  const convexityNum = Number(convexity.toString());
  const actualPriceNum = Number(actualPrice.toString());
  const utilityNum = Number(utility.toString());
  const emitterTCEANum = Number(emitterTCEA.toString());
  const emitterTCEAWithShieldNum = Number(emitterTCEAWithShield.toString());
  const bondholderTREANum = Number(bondholderTREA.toString());

  // Calcular rendimiento (yield) aproximado
  const priceYieldRatio = (actualPriceNum / nominalValue) * 100;
  
  return {
    priceRendimiento: interpretPriceYield(priceYieldRatio, cok, bondholderTREANum),
    
    convexidad: interpretConvexity(convexityNum),
    
    duracionModificada: interpretModifiedDuration(modifiedDurationNum),
    
    volatilidad: durationNum > 0 ? interpretVolatility(durationNum) : undefined,
    
    precioActual: interpretCurrentPrice(actualPriceNum, nominalValue, comercialValue),
    
    utilidadPerdida: interpretUtility(utilityNum, comercialValue, bondholderTREANum, cok),
    
    tceaEmisor: interpretEmitterTCEA(emitterTCEANum, cok),
    
    tceaEmisorEscudo: interpretEmitterTCEAWithShield(emitterTCEANum, emitterTCEAWithShieldNum),
    
    treaBonista: interpretBondholderTREA(bondholderTREANum, cok),

    conclusionGeneral: generateGeneralConclusion({
      modifiedDuration: modifiedDurationNum,
      convexity: convexityNum,
      bondholderTREA: bondholderTREANum,
      emitterTCEA: emitterTCEANum,
      emitterTCEAWithShield: emitterTCEAWithShieldNum,
      actualPrice: actualPriceNum,
      nominalValue,
      utility: utilityNum,
      cok
    })
  };
}

function interpretPriceYield(priceYieldRatio: number, cok: number, bondholderTREA: number): string {
  const premium = priceYieldRatio - 100;
  const yieldSpread = bondholderTREA - cok;
  
  if (priceYieldRatio > 110) {
    if (yieldSpread > 0) {
      return `El bono se está vendiendo con una prima alta del ${premium.toFixed(2)}% sobre su valor original. Los inversionistas están dispuestos a pagar más porque el bono ofrece mejores intereses que otros bonos disponibles en el mercado.`;
    } else {
      return `El bono se vende con una prima alta del ${premium.toFixed(2)}% sobre su valor original, pero paradójicamente ofrece un rendimiento inferior al COK en ${Math.abs(yieldSpread).toFixed(2)}%. Esta sobrevaloración no está justificada por los retornos que genera.`;
    }
  } else if (priceYieldRatio > 102) {
    if (yieldSpread > 0.5) {
      return `El bono tiene una prima moderada del ${premium.toFixed(2)}% sobre su valor nominal y ofrece un rendimiento adicional de ${yieldSpread.toFixed(2)}% sobre el COK, lo que justifica su valoración.`;
    } else {
      return `El bono tiene una prima del ${premium.toFixed(2)}% sobre su valor nominal, pero solo ofrece ${yieldSpread > 0 ? '+' : ''}${yieldSpread.toFixed(2)}% respecto al COK. Esta prima no está bien justificada por los retornos que genera.`;
    }
  } else if (priceYieldRatio > 98) {
    if (yieldSpread > 0) {
      return `El precio está cerca del valor original (${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%), lo que es razonable dado que ofrece ${yieldSpread.toFixed(2)}% sobre el COK requerido.`;
    } else {
      return `Aunque el precio está cerca del valor original (${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%), el rendimiento de ${Math.abs(yieldSpread).toFixed(2)}% por debajo del COK indica que está sobrevalorado para lo que realmente ofrece.`;
    }
  } else {
    if (yieldSpread < -1) {
      return `El bono se vende con descuento del ${Math.abs(premium).toFixed(2)}% y aún así ofrece ${Math.abs(yieldSpread).toFixed(2)}% menos que el COK. Incluso con descuento, sigue siendo una mala inversión.`;
    } else {
      return `El descuento del ${Math.abs(premium).toFixed(2)}% puede representar una oportunidad si el mercado está siendo demasiado pesimista, aunque el rendimiento de ${yieldSpread >= 0 ? '+' : ''}${yieldSpread.toFixed(2)}% versus COK sugiere cautela.`;
    }
  }
}

function interpretConvexity(convexity: number): string {
  if (convexity > 15) {
    return `La convexidad de ${convexity.toFixed(2)} es alta, lo que significa que el bono tiene buena protección cuando las tasas de interés suben y bajan. Si las tasas bajan, el precio del bono sube más de lo esperado; si las tasas suben, el precio baja menos de lo esperado. Esto es una ventaja para el inversionista.`;
  } else if (convexity > 8) {
    return `Con una convexidad de ${convexity.toFixed(2)}, el bono tiene una protección moderada contra los cambios en las tasas de interés. Esto significa que los cambios en el precio del bono serán más predecibles y menos extremos cuando cambien las tasas.`;
  } else {
    return `La convexidad baja de ${convexity.toFixed(2)} significa que el precio del bono cambia de forma casi directa con las tasas de interés. Aunque esto hace que sea más fácil predecir cómo cambiará el precio, también significa que no hay mucha protección extra cuando las tasas suben.`;
  }
}

function interpretModifiedDuration(modifiedDuration: number): string {
  if (modifiedDuration > 7) {
    return `La duración modificada de ${modifiedDuration.toFixed(2)} años indica que el bono es muy sensible a los cambios en las tasas de interés. Si las tasas suben 1%, el precio del bono bajará aproximadamente ${modifiedDuration.toFixed(2)}%. Esto significa que es un bono de alto riesgo para cambios en las tasas.`;
  } else if (modifiedDuration > 3) {
    return `Con una duración modificada de ${modifiedDuration.toFixed(2)} años, el bono tiene una sensibilidad moderada a las tasas de interés. Si las tasas suben 1%, el precio del bono bajará aproximadamente ${modifiedDuration.toFixed(2)}%. Es un nivel de riesgo manejable para inversiones a mediano plazo.`;
  } else {
    return `La duración modificada de ${modifiedDuration.toFixed(2)} años muestra que el bono es poco sensible a los cambios en las tasas de interés. Si las tasas suben 1%, el precio solo bajará ${modifiedDuration.toFixed(2)}%. Esto lo hace apropiado para inversionistas conservadores que buscan estabilidad.`;
  }
}

function interpretVolatility(duration: number): string {
  if (duration > 10) {
    return `La duración de ${duration.toFixed(2)} períodos muestra que el bono está expuesto a cambios importantes en las tasas de interés. El tiempo promedio de recuperación de la inversión es largo, lo que hace que el bono sea más sensible a las variaciones del mercado y requiere mayor atención.`;
  } else if (duration > 5) {
    return `La duración de ${duration.toFixed(2)} períodos indica que el bono tiene una exposición moderada a los cambios en las tasas. Esto significa que el comportamiento del precio será predecible ante cambios normales en las condiciones del mercado.`;
  } else {
    return `Con una duración de ${duration.toFixed(2)} períodos, el bono tiene poca exposición a la volatilidad de las tasas. Esto lo convierte en un instrumento estable, ideal para quienes buscan seguridad y flujos predecibles más que grandes ganancias.`;
  }
}

function interpretCurrentPrice(actualPrice: number, nominalValue: number, comercialValue: number): string {
  const vsNominal = ((actualPrice / nominalValue) - 1) * 100;
  const vsComercial = ((actualPrice / comercialValue) - 1) * 100;
  
  let interpretation = `El precio actual de ${actualPrice.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} `;
  
  if (Math.abs(vsNominal) < 1) {
    interpretation += `está muy cerca del valor nominal, lo que indica que el mercado considera que el bono está correctamente valorado y no hay grandes riesgos. `;
  } else if (vsNominal > 5) {
    interpretation += `muestra una prima importante del ${vsNominal.toFixed(2)}% sobre el valor nominal. Esto significa que los inversionistas están dispuestos a pagar más porque esperan que las tasas de interés bajen o porque el bono es muy atractivo. `;
  } else if (vsNominal > 0) {
    interpretation += `tiene una prima moderada del ${vsNominal.toFixed(2)}% sobre el valor nominal, lo que indica que el bono paga buenos intereses comparado con otras opciones del mercado. `;
  } else if (vsNominal > -5) {
    interpretation += `se vende con un descuento controlado del ${Math.abs(vsNominal).toFixed(2)}% bajo el valor nominal. Esto puede ser una oportunidad de compra si las condiciones del mercado están temporalmente desfavorables. `;
  } else {
    interpretation += `tiene un descuento grande del ${Math.abs(vsNominal).toFixed(2)}% bajo el valor nominal, lo que puede indicar problemas con el emisor o cambios importantes en las condiciones del mercado. `;
  }
  
  if (Math.abs(vsComercial) < 0.5) {
    interpretation += `El precio se mantiene estable respecto al valor comercial, lo que es buena señal para la liquidez del bono.`;
  } else if (vsComercial > 2) {
    interpretation += `Ha subido ${vsComercial.toFixed(2)}% desde el valor comercial, indicando mejores condiciones.`;
  } else if (vsComercial < -2) {
    interpretation += `Ha bajado ${Math.abs(vsComercial).toFixed(2)}% desde el valor comercial, lo que requiere atención.`;
  } else {
    interpretation += `La variación del ${vsComercial >= 0 ? '+' : ''}${vsComercial.toFixed(2)}% respecto al valor comercial está dentro de lo normal.`;
  }
  
  return interpretation;
}

function interpretUtility(utility: number, comercialValue: number, bondholderTREA: number, cok: number): string {
  const utilityPercentage = (utility / comercialValue) * 100;
  const valueCreation = bondholderTREA - cok;
  
  if (utility > 0) {
    if (utilityPercentage > 15) {
      return `La utilidad de ${utility.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${utilityPercentage.toFixed(2)}% del valor comercial) representa una excelente ganancia. El rendimiento extra de ${valueCreation.toFixed(2)}% sobre el COK confirma que este bono es mejor que otras alternativas de inversión con riesgo similar.`;
    } else if (utilityPercentage > 5) {
      return `Se obtiene una utilidad atractiva de ${utility.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${utilityPercentage.toFixed(2)}% del valor comercial). La ganancia adicional del ${valueCreation.toFixed(2)}% sobre el COK demuestra que vale la pena invertir en este bono.`;
    } else {
      return `La utilidad positiva de ${utility.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${utilityPercentage.toFixed(2)}% del valor comercial) muestra buenos resultados, aunque el margen sobre el COK de ${valueCreation.toFixed(2)}% sugiere que podría haber otras opciones con mejor rentabilidad.`;
    }
  } else {
    if (Math.abs(utilityPercentage) > 10) {
      return `La pérdida de ${Math.abs(utility).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${Math.abs(utilityPercentage).toFixed(2)}% del valor comercial) representa una destrucción significativa de valor. El rendimiento inferior al COK en ${Math.abs(valueCreation).toFixed(2)}% demuestra que este bono es una mala inversión que no compensa el riesgo asumido.`;
    } else if (Math.abs(utilityPercentage) > 3) {
      return `La pérdida de ${Math.abs(utility).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${Math.abs(utilityPercentage).toFixed(2)}% del valor comercial) es inaceptable para cualquier inversionista. El déficit de ${Math.abs(valueCreation).toFixed(2)}% versus el COK confirma que el bono no está pagando lo suficiente por el riesgo que representa.`;
    } else {
      return `Aunque la pérdida de ${Math.abs(utility).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} (${Math.abs(utilityPercentage).toFixed(2)}% del valor comercial) es pequeña, cualquier pérdida es problemática. El déficit de ${Math.abs(valueCreation).toFixed(2)}% versus COK indica que existen mejores alternativas de inversión.`;
    }
  }
}

function interpretEmitterTCEA(emitterTCEA: number, cok: number): string {
  const costSpread = emitterTCEA - cok;
  
  if (emitterTCEA > cok * 1.5) {
    return `La TCEA del emisor de ${emitterTCEA.toFixed(2)}% representa un costo de financiamiento muy alto, superando el COK en ${costSpread.toFixed(2)} puntos porcentuales. Este nivel elevado puede afectar la capacidad del emisor para financiar futuros proyectos de manera rentable.`;
  } else if (emitterTCEA > cok) {
    return `Con una TCEA del emisor de ${emitterTCEA.toFixed(2)}%, el costo de financiamiento supera el COK en ${costSpread.toFixed(2)} puntos porcentuales. Aunque es un sobrecosto manejable, limita las opciones del emisor para tomar más deuda en el futuro.`;
  } else if (emitterTCEA > cok * 0.8) {
    return `La TCEA del emisor de ${emitterTCEA.toFixed(2)}% está en un nivel favorable respecto al COK, con un ahorro de ${Math.abs(costSpread).toFixed(2)} puntos porcentuales. Esto representa condiciones de financiamiento equilibradas que le dan flexibilidad al emisor.`;
  } else {
    return `Una TCEA del emisor de ${emitterTCEA.toFixed(2)}% muestra condiciones excelentes de financiamiento, con un ahorro significativo de ${Math.abs(costSpread).toFixed(2)} puntos porcentuales versus el COK. Esta ventaja fortalece la posición financiera del emisor.`;
  }
}

function interpretEmitterTCEAWithShield(emitterTCEA: number, emitterTCEAWithShield: number): string {
  const shieldBenefit = emitterTCEA - emitterTCEAWithShield;
  const shieldEffectiveness = (shieldBenefit / emitterTCEA) * 100;
  
  if (shieldBenefit > 2) {
    return `El escudo fiscal genera un beneficio importante de ${shieldBenefit.toFixed(2)} puntos porcentuales, reduciendo la TCEA efectiva a ${emitterTCEAWithShield.toFixed(2)}%. Esta reducción del ${shieldEffectiveness.toFixed(1)}% en el costo representa una ventaja significativa que mejora la rentabilidad del emisor.`;
  } else if (shieldBenefit > 0.5) {
    return `La TCEA con escudo fiscal de ${emitterTCEAWithShield.toFixed(2)}% incluye un beneficio tributario de ${shieldBenefit.toFixed(2)} puntos porcentuales. Esta reducción del ${shieldEffectiveness.toFixed(1)}% ayuda a optimizar el costo de financiamiento del emisor de manera moderada.`;
  } else {
    return `El impacto del escudo fiscal es limitado, con una reducción de apenas ${shieldBenefit.toFixed(2)} puntos porcentuales en la TCEA (${shieldEffectiveness.toFixed(1)}%). Esto sugiere que el emisor tiene capacidad limitada para aprovechar los beneficios fiscales de la deuda.`;
  }
}

function interpretBondholderTREA(bondholderTREA: number, cok: number): string {
  const excessReturn = bondholderTREA - cok;
  const riskAdjustedReturn = (excessReturn / cok) * 100;
  
  if (bondholderTREA > cok * 1.3) {
    return `La TREA del bonista de ${bondholderTREA.toFixed(2)}% supera significativamente el COK en ${excessReturn.toFixed(2)} puntos porcentuales, generando un retorno extra del ${riskAdjustedReturn.toFixed(1)}%. Esta rentabilidad excelente hace que el bono sea muy atractivo y justifica completamente la inversión.`;
  } else if (bondholderTREA > cok) {
    return `Con una TREA de ${bondholderTREA.toFixed(2)}%, el bono genera un retorno positivo de ${excessReturn.toFixed(2)} puntos porcentuales sobre el COK requerido. Este exceso del ${riskAdjustedReturn.toFixed(1)}% confirma que es una buena inversión que compensa adecuadamente el riesgo.`;
  } else if (bondholderTREA > cok * 0.9) {
    return `La TREA de ${bondholderTREA.toFixed(2)}% queda por debajo del COK requerido por ${Math.abs(excessReturn).toFixed(2)} puntos porcentuales. Esta diferencia del ${Math.abs(riskAdjustedReturn).toFixed(1)}% indica que el bono no está compensando adecuadamente el riesgo y hay mejores alternativas disponibles.`;
  } else {
    return `Una TREA de ${bondholderTREA.toFixed(2)}% es claramente insuficiente comparada con el COK requerido, con un déficit significativo de ${Math.abs(excessReturn).toFixed(2)} puntos porcentuales (${Math.abs(riskAdjustedReturn).toFixed(1)}% por debajo). Esta rentabilidad pobre hace que no valga la pena invertir en este bono.`;
  }
}

interface GeneralConclusionParams {
  modifiedDuration: number;
  convexity: number;
  bondholderTREA: number;
  emitterTCEA: number;
  emitterTCEAWithShield: number;
  actualPrice: number;
  nominalValue: number;
  utility: number;
  cok: number;
}

function generateGeneralConclusion(params: GeneralConclusionParams): string {
  const {
    modifiedDuration,
    convexity,
    bondholderTREA,
    emitterTCEA,
    emitterTCEAWithShield,
    actualPrice,
    nominalValue,
    utility,
    cok
  } = params;

  const riskProfile = modifiedDuration > 5 ? 'alto' : modifiedDuration > 2 ? 'moderado' : 'bajo';
  const investorReturn = bondholderTREA - cok;
  const emitterCost = emitterTCEA - cok;
  const pricePosition = ((actualPrice / nominalValue) - 1) * 100;
  const isAttractive = investorReturn > 0;
  const isExpensive = emitterCost > 0;
  const isLosing = utility < 0;

  let conclusion = `**Resumen General:** Este bono presenta un nivel de riesgo de tasas ${riskProfile} `;
  
  if (modifiedDuration > 3) {
    conclusion += `(duración modificada: ${modifiedDuration.toFixed(2)}), lo que significa alta sensibilidad a cambios en las tasas de interés. `;
  } else {
    conclusion += `(duración modificada: ${modifiedDuration.toFixed(2)}), con baja sensibilidad a cambios de tasas. `;
  }

  if (convexity > 8) {
    conclusion += `La convexidad alta (${convexity.toFixed(2)}) ofrece protección contra subidas de tasas, pero esto no compensa los problemas fundamentales de rentabilidad. `;
  }

  conclusion += `**Para el Inversionista:** `;
  if (isAttractive) {
    if (investorReturn > 2) {
      conclusion += `Es muy atractivo porque ofrece ${investorReturn.toFixed(2)}% más de rentabilidad que el COK requerido. `;
    } else {
      conclusion += `Es moderadamente atractivo con ${investorReturn.toFixed(2)}% extra sobre el COK. `;
    }
  } else {
    if (Math.abs(investorReturn) > 2) {
      conclusion += `**NO SE RECOMIENDA** - ofrece ${Math.abs(investorReturn).toFixed(2)}% menos que el COK, lo que significa pérdida de valor real. `;
    } else {
      conclusion += `No es recomendable porque ofrece ${Math.abs(investorReturn).toFixed(2)}% menos que el COK mínimo requerido. `;
    }
  }

  if (isLosing) {
    conclusion += `El inversionista registra pérdidas económicas directas, haciendo esta inversión inviable. `;
  }

  if (pricePosition > 5) {
    conclusion += `Además, cotiza con prima del ${pricePosition.toFixed(2)}%, lo que empeora la relación riesgo-retorno. `;
  } else if (pricePosition < -5) {
    conclusion += `Aunque cotiza con descuento del ${Math.abs(pricePosition).toFixed(2)}%, esto no es suficiente para compensar la mala rentabilidad. `;
  }

  conclusion += `**Para el Emisor:** `;
  if (isExpensive) {
    if (emitterCost > 2) {
      conclusion += `**FINANCIAMIENTO COSTOSO** - paga ${emitterCost.toFixed(2)}% más que el COK, lo que representa un sobrecosto significativo que afecta la viabilidad económica. `;
    } else {
      conclusion += `Asume un sobrecosto del ${emitterCost.toFixed(2)}% sobre el COK, limitando la rentabilidad de sus proyectos. `;
    }
  } else {
    conclusion += `Tiene condiciones favorables de financiamiento con ahorro del ${Math.abs(emitterCost).toFixed(2)}% versus el COK. `;
  }

  const shieldBenefit = emitterTCEA - emitterTCEAWithShield;
  if (shieldBenefit > 1) {
    conclusion += `El escudo fiscal reduce parcialmente el costo, pero no elimina el problema fundamental. `;
  }

  conclusion += `**Recomendación Final:** `;
  if (!isAttractive && isExpensive) {
    conclusion += `Este bono presenta una situación perder-perder: el inversionista no recibe compensación adecuada por el riesgo y el emisor paga demasiado por financiarse. `;
  } else if (!isAttractive) {
    conclusion += `Aunque el emisor tiene condiciones favorables, el inversionista no debería aceptar rendimientos por debajo del COK. `;
  } else if (isExpensive) {
    conclusion += `Mientras el inversionista obtiene buenos retornos, el emisor debería buscar alternativas de financiamiento más económicas. `;
  } else {
    conclusion += `Representa una situación beneficiosa tanto para el inversionista como para el emisor. `;
  }

  if (modifiedDuration < 2 && !isAttractive) {
    conclusion += `La baja volatilidad no justifica aceptar rendimientos insuficientes.`;
  } else if (modifiedDuration > 4 && !isAttractive) {
    conclusion += `La alta sensibilidad a tasas añade riesgo adicional a una inversión ya poco atractiva.`;
  }

  return conclusion;
}
