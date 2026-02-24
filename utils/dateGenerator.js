export function generateSessionDates(start, end, frequency) {
    const dates = [];
    let current = new Date(start);

    while (current <= end) {
        dates.push(new Date(current));
        switch (frequency) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                break;
        }
    }
    return dates;
}